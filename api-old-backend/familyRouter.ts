import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { familyMembers, users, subscriptions } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { signToken } from "./lib/jwt";

const MAX_FAMILY_MEMBERS = 3;

export const familyRouter = createRouter({
  // Get current family members (owner view)
  myFamily: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    // Check if user is on family or classroom plan
    if (ctx.user.subscription.tier !== "family" && ctx.user.subscription.tier !== "classroom") {
      return { members: [], canInvite: false, maxMembers: 1, reason: "Upgrade to Family plan to add members" };
    }

    const maxMembers = ctx.user.subscription.tier === "family" ? MAX_FAMILY_MEMBERS : 50;

    // Get all family members under this owner
    const members = await db.query.familyMembers.findMany({
      where: eq(familyMembers.ownerUserId, ctx.user.id),
    });

    // Enrich with member user info if accepted
    const enriched = await Promise.all(
      members.map(async (m) => {
        if (m.memberUserId) {
          const memberUser = await db.query.users.findFirst({
            where: eq(users.id, m.memberUserId),
          });
          return {
            ...m,
            memberEmail: memberUser?.email || m.inviteEmail,
            memberName: memberUser?.email?.split("@")[0] || "Invited",
          };
        }
        return { ...m, memberEmail: m.inviteEmail, memberName: "Invited" };
      })
    );

    const activeCount = members.filter((m) => m.status === "active").length;

    return {
      members: enriched,
      canInvite: activeCount < maxMembers,
      maxMembers,
      activeCount,
    };
  }),

  // Check if I'm a family member (sub-account view)
  myFamilyAccess: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.memberUserId, ctx.user.id),
        eq(familyMembers.status, "active")
      ),
    });

    if (!membership) return null;

    // Get owner's subscription to check if still active
    const ownerSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, membership.ownerUserId),
    });

    if (!ownerSub || ownerSub.status === "expired" || ownerSub.status === "cancelled") {
      return { active: false, reason: "Family plan has expired" };
    }

    // Get owner info
    const owner = await db.query.users.findFirst({
      where: eq(users.id, membership.ownerUserId),
    });

    return {
      active: true,
      ownerEmail: owner?.email || "",
      tier: ownerSub.tier,
    };
  }),

  // Send invitation (family owner)
  inviteMember: authedQuery
    .input(z.object({ email: z.string().email("Please enter a valid email") }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Check tier
      if (ctx.user.subscription.tier !== "family" && ctx.user.subscription.tier !== "classroom") {
        throw new Error("UPGRADE_REQUIRED: Family plan required to invite members");
      }

      const maxMembers = ctx.user.subscription.tier === "family" ? MAX_FAMILY_MEMBERS : 50;

      // Check current member count
      const currentMembers = await db.query.familyMembers.findMany({
        where: and(
          eq(familyMembers.ownerUserId, ctx.user.id),
          eq(familyMembers.status, "active")
        ),
      });

      if (currentMembers.length >= maxMembers) {
        throw new Error(`FAMILY_LIMIT_REACHED: You can add up to ${maxMembers} family members on your plan. Remove one to add another.`);
      }

      // Check if already invited
      const existing = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.ownerUserId, ctx.user.id),
          eq(familyMembers.inviteEmail, input.email)
        ),
      });

      if (existing) {
        throw new Error("ALREADY_INVITED: This email has already been invited to your family plan");
      }

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      // Create invitation
      await db.insert(familyMembers).values({
        ownerUserId: ctx.user.id,
        memberUserId: existingUser?.id || 0,
        inviteEmail: input.email,
        status: "pending",
      });

      // In production: send email with invitation link containing a signed token
      // For now, the invitee just registers/logs in and we'll auto-link them

      return { success: true, message: `Invitation sent to ${input.email}` };
    }),

  // Remove a family member
  removeMember: authedQuery
    .input(z.object({ memberId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db
        .update(familyMembers)
        .set({ status: "removed" })
        .where(
          and(
            eq(familyMembers.id, input.memberId),
            eq(familyMembers.ownerUserId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Accept invitation (called when a new user registers with an invited email)
  acceptInvitation: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const email = ctx.user.email;

    // Find pending invitation for this email
    const invitation = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.inviteEmail, email),
        eq(familyMembers.status, "pending")
      ),
    });

    if (!invitation) {
      return { accepted: false, message: "No pending invitation found" };
    }

    // Check owner's subscription is still valid
    const ownerSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, invitation.ownerUserId),
    });

    if (!ownerSub || ownerSub.status === "expired" || ownerSub.status === "cancelled") {
      return { accepted: false, message: "Family plan is no longer active" };
    }

    // Activate the membership
    await db
      .update(familyMembers)
      .set({
        status: "active",
        memberUserId: ctx.user.id,
        acceptedAt: new Date(),
      })
      .where(eq(familyMembers.id, invitation.id));

    return { accepted: true, message: "Welcome to the family plan!" };
  }),

  // Register as family member (creates sub-account)
  registerFamilyMember: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        inviteToken: z.string(),
        fullName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Decode invite token (in production: verify JWT)
      const parts = input.inviteToken.split(":");
      const ownerId = parseInt(parts[0], 10);
      const invitedEmail = parts[1];

      if (!ownerId || !invitedEmail || invitedEmail !== input.email) {
        throw new Error("Invalid invitation link");
      }

      // Check invitation exists
      const invitation = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.ownerUserId, ownerId),
          eq(familyMembers.inviteEmail, input.email),
          eq(familyMembers.status, "pending")
        ),
      });

      if (!invitation) {
        throw new Error("Invitation not found or already used");
      }

      // Check owner's plan
      const ownerSub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, ownerId),
      });

      if (!ownerSub || ownerSub.status === "expired" || ownerSub.status === "cancelled") {
        throw new Error("Family plan is no longer active");
      }

      // Create user account
      const passwordHash = await bcrypt.hash(input.password, 12);
      const [{ id: userId }] = await db.insert(users).values({
        email: input.email,
        passwordHash,
        emailVerified: 1,
      }).$returningId();

      // Activate family membership
      await db
        .update(familyMembers)
        .set({
          status: "active",
          memberUserId: userId,
          acceptedAt: new Date(),
        })
        .where(eq(familyMembers.id, invitation.id));

      // Generate auth token
      const token = signToken({ userId, email: input.email, role: "user" });

      return { success: true, token, userId };
    }),
});
