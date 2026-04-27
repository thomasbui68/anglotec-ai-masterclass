import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, formatPrice, formatPriceMonthly, type SubscriptionTier } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check, Zap, Users, GraduationCap, Crown, ArrowLeft,
  Sparkles, Shield, TrendingUp, Volume2, Smartphone,
  Star, Loader2, Clock
} from "lucide-react";

const PLAN_DETAILS = [
  {
    tier: "free" as SubscriptionTier,
    name: "Free",
    description: "Start learning with basic access",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Sparkles,
    color: "from-gray-500 to-gray-600",
    borderColor: "border-gray-200",
    popular: false,
    features: [
      "20 phrases per day",
      "6 basic categories",
      "Local progress tracking",
      "Basic achievements",
    ],
    notIncluded: [
      "AI voice pronunciation",
      "Cross-device sync",
      "Weekly new phrases",
      "Advanced analytics",
    ],
  },
  {
    tier: "pro" as SubscriptionTier,
    name: "Pro",
    description: "Unlimited access for serious learners",
    monthlyPrice: 1999,
    yearlyPrice: 17999,
    icon: Crown,
    color: "from-orange-500 to-yellow-500",
    borderColor: "border-orange-300",
    popular: true,
    badge: "Most Popular",
    features: [
      "Unlimited phrases (3,000+)",
      "All 12 categories",
      "AI voice pronunciation",
      "Cross-device sync",
      "Weekly new phrases",
      "Advanced analytics",
      "Progress reports",
      "Priority support",
    ],
    notIncluded: [
      "Family sharing",
      "Parent dashboard",
    ],
  },
  {
    tier: "family" as SubscriptionTier,
    name: "Family",
    description: "Learn together with your family",
    monthlyPrice: 3999,
    yearlyPrice: 34999,
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    borderColor: "border-blue-300",
    popular: false,
    badge: "Best Value",
    features: [
      "Everything in Pro",
      "Up to 3 family members",
      "Parent dashboard",
      "Weekly family reports",
      "Shared achievements",
      "Family challenges",
    ],
    notIncluded: [
      "Teacher dashboard",
      "Classroom management",
    ],
  },
  {
    tier: "classroom" as SubscriptionTier,
    name: "Classroom",
    description: "For educators and teams",
    monthlyPrice: 19999,
    yearlyPrice: 199999,
    icon: GraduationCap,
    color: "from-purple-500 to-pink-500",
    borderColor: "border-purple-300",
    popular: false,
    badge: "For Schools",
    features: [
      "Everything in Family",
      "Up to 50 students",
      "Teacher dashboard",
      "Class analytics",
      "Assignment builder",
      "Gradebook export",
      "Priority support",
      "Custom onboarding",
    ],
    notIncluded: [],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const subscription = useSubscription();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  // Calculate days left in trial
  const trialDaysLeft = subscription.trialEndsAt
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const inTrial = subscription.status === "trial" && trialDaysLeft > 0;

  const getButtonText = (planTier: SubscriptionTier) => {
    // During trial, show "Keep Pro" on Pro plan instead of "Start Pro Trial"
    if (inTrial && planTier === "pro") {
      return "Keep Pro After Trial";
    }
    if (inTrial && planTier === "family") {
      return "Switch to Family";
    }
    if (planTier === "free") return "Downgrade to Free";
    if (planTier === "classroom") return "Contact Sales";
    if (planTier === "pro") return "Start Pro Trial";
    if (planTier === "family") return "Start Family Trial";
    return "Choose Plan";
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }

    if (tier === "classroom") {
      toast.info("Classroom plan requires a quick setup call. We'll contact you shortly!");
      return;
    }

    setUpgradingTier(tier);
    try {
      const result = await subscription.upgrade(tier, 30);
      if (result.success) {
        toast.success(`${tier.charAt(0).toUpperCase() + tier.slice(1)} plan activated!`);
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setUpgradingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="" className="h-10 w-10 object-contain drop-shadow-lg rounded-xl" />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Anglotec AI</h1>
              <p className="text-[10px] text-gray-400">Choose Your Plan</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft size={18} className="mr-1" /> Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 pb-24">
        {/* Hero */}
        <div className="text-center mb-10">
          {inTrial ? (
            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 mb-4 text-xs">
              <Clock size={12} className="mr-1" /> {trialDaysLeft} days left in your Pro trial
            </Badge>
          ) : (
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30 mb-4 text-xs">
              <Star size={12} className="mr-1" /> Try any plan free for 14 days
            </Badge>
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {inTrial ? "Keep Your Pro Access" : "Choose Your Learning Path"}
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            {inTrial
              ? "Your trial is active! Pick a plan now to keep unlimited access after your trial ends. No interruptions."
              : "Start free and upgrade when you are ready. Every plan comes with a 14-day free trial — no credit card needed."}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm ${billingCycle === "monthly" ? "text-white font-semibold" : "text-gray-400"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="relative w-14 h-7 rounded-full bg-white/10 border border-white/20 transition-colors"
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-orange-500 shadow-lg transition-all duration-300 ${
                  billingCycle === "yearly" ? "left-7" : "left-0.5"
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === "yearly" ? "text-white font-semibold" : "text-gray-400"}`}>
              Yearly
            </span>
            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-[10px]">
              Save 25%
            </Badge>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PLAN_DETAILS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscription.tier === plan.tier && !inTrial;
            const isLoading = upgradingTier === plan.tier;
            const buttonText = getButtonText(plan.tier);

            return (
              <Card
                key={plan.tier}
                className={`relative border-2 ${
                  isCurrentPlan ? plan.borderColor : "border-white/5"
                } bg-white/5 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular ? "ring-2 ring-orange-400/40" : ""
                }`}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className={`bg-gradient-to-r ${plan.color} text-white text-xs font-bold text-center py-1.5`}>
                    {plan.badge}
                  </div>
                )}

                <CardHeader className="pb-3 pt-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-gray-400">{plan.description}</p>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Price */}
                  <div className="mb-4">
                    {plan.monthlyPrice === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">
                          {billingCycle === "monthly"
                            ? formatPriceMonthly(plan.monthlyPrice)
                            : formatPriceMonthly(plan.yearlyPrice / 12)}
                        </span>
                        <span className="text-gray-400 text-sm">/mo</span>
                        {billingCycle === "yearly" && (
                          <p className="text-xs text-green-400 mt-1">
                            {formatPrice(plan.yearlyPrice)} billed yearly
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <Button
                      disabled
                      className="w-full h-11 bg-white/10 text-white border border-white/20 cursor-default"
                    >
                      <Check size={16} className="mr-1" /> Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.tier)}
                      disabled={isLoading}
                      className={`w-full h-11 bg-gradient-to-r ${plan.color} text-white font-semibold hover:opacity-90 transition-opacity`}
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin mr-1" />
                      ) : (
                        <Zap size={16} className="mr-1" />
                      )}
                      {isLoading ? "Activating..." : buttonText}
                    </Button>
                  )}

                  {/* Features */}
                  <div className="mt-5 space-y-2.5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-xs">
                        <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-xs opacity-40">
                        <span className="text-gray-500 text-[10px] shrink-0 mt-0.5">-</span>
                        <span className="text-gray-500">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 mb-10">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-green-400" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-blue-400" />
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Volume2 size={14} className="text-orange-400" />
            <span>14-Day Free Trial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone size={14} className="text-purple-400" />
            <span>Works on All Devices</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-white text-center mb-6">Questions? We Have Answers</h3>
          <div className="space-y-3">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! Cancel from your Settings page whenever you want. You will keep access until the end of your current billing period. No hard feelings!",
              },
              {
                q: "What happens when my trial ends?",
                a: "We will remind you a few days before. If you choose not to subscribe, your account switches to the Free plan with 20 phrases per day. Your progress is always saved!",
              },
              {
                q: "Can I switch plans later?",
                a: "Absolutely! Upgrade or downgrade anytime. We automatically handle any price difference.",
              },
              {
                q: "Do you offer school discounts?",
                a: "Yes! Classroom plans include special educational pricing. Contact us and we will set up a free evaluation for your school.",
              },
              {
                q: "What payment methods do you accept?",
                a: "All major credit cards, PayPal, and Apple Pay. For Classroom plans, we can also send an invoice.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm text-white font-medium hover:bg-white/5 transition-colors">
                  {faq.q}
                  <span className="text-gray-500 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="px-4 pb-4 text-xs text-gray-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-xs mt-12 pb-4">
          <p>Anglotec Academy — Part of the Anglotec AI Apps Family</p>
          <p className="mt-1">Questions? Contact us at support@anglotec.ai</p>
        </footer>
      </main>
    </div>
  );
}
