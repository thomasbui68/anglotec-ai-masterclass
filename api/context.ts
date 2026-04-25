import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyToken } from "./lib/jwt";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export type UserContext = {
  id: number;
  email: string;
  role: string;
  name?: string | null;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: UserContext;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = {
    req: opts.req,
    resHeaders: opts.resHeaders,
  };

  // Read auth token from cookie or Authorization header
  const cookie = opts.req.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/auth_token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      // Verify user still exists in DB
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });
      if (user) {
        ctx.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.email.split("@")[0],
        };
      }
    }
  }

  return ctx;
}
