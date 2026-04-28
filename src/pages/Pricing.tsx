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
  Star, Loader2, Clock, Mail, Building2, Phone, User, MessageSquare, X
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const subscription = useSubscription();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  
  // Classroom request modal state
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomForm, setClassroomForm] = useState({
    schoolName: "",
    contactName: "",
    email: "",
    phone: "",
    students: "16",
    message: "",
  });
  const [sendingRequest, setSendingRequest] = useState(false);

  const PLAN_DETAILS = [
    {
      tier: "free" as SubscriptionTier,
      name: t("pricing.free"),
      description: t("pricing.freeDesc"),
      monthlyPrice: 0,
      yearlyPrice: 0,
      icon: Sparkles,
      color: "from-gray-500 to-gray-600",
      borderColor: "border-gray-200",
      popular: false,
      features: [
        t("pricing.features.phrases20"),
        t("pricing.features.categories6"),
        t("pricing.features.localTracking"),
        t("pricing.features.basicAchievements"),
      ],
      notIncluded: [
        t("pricing.features.aiVoice"),
        t("pricing.features.crossDevice"),
        t("pricing.features.weeklyPhrases"),
        t("pricing.features.advancedAnalytics"),
      ],
    },
    {
      tier: "pro" as SubscriptionTier,
      name: t("pricing.pro"),
      description: t("pricing.proDesc"),
      monthlyPrice: 1999,
      yearlyPrice: 17999,
      icon: Crown,
      color: "from-orange-500 to-yellow-500",
      borderColor: "border-orange-300",
      popular: true,
      badge: t("pricing.mostPopular"),
      features: [
        t("pricing.features.unlimitedPhrases"),
        t("pricing.features.allCategories"),
        t("pricing.features.aiVoice"),
        t("pricing.features.crossDevice"),
        t("pricing.features.weeklyPhrases"),
        t("pricing.features.advancedAnalytics"),
        t("pricing.features.progressReports"),
        t("pricing.features.prioritySupport"),
      ],
      notIncluded: [
        t("pricing.features.familySharing"),
        t("pricing.features.parentDashboard"),
      ],
    },
    {
      tier: "family" as SubscriptionTier,
      name: t("pricing.family"),
      description: t("pricing.familyDesc"),
      monthlyPrice: 3999,
      yearlyPrice: 34999,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      borderColor: "border-blue-300",
      popular: false,
      badge: t("pricing.bestValue"),
      features: [
        t("pricing.features.everythingPro"),
        t("pricing.features.family5"),
        t("pricing.features.parentDashboard"),
        t("pricing.features.familyReports"),
        t("pricing.features.sharedAchievements"),
        t("pricing.features.familyChallenges"),
      ],
      notIncluded: [
        t("pricing.features.teacherDashboard"),
        t("pricing.features.classroomMgmt"),
      ],
    },
    {
      tier: "classroom" as SubscriptionTier,
      name: t("pricing.classroom"),
      description: t("pricing.classroomDesc"),
      monthlyPrice: 20000,
      yearlyPrice: 180000,
      icon: GraduationCap,
      color: "from-purple-500 to-pink-500",
      borderColor: "border-purple-300",
      popular: false,
      badge: t("pricing.forSchools"),
      features: [
        t("pricing.features.everythingFamily"),
        t("pricing.features.students16"),
        t("pricing.features.teacherDashboard"),
        t("pricing.features.classAnalytics"),
        t("pricing.features.assignmentBuilder"),
        t("pricing.features.gradebookExport"),
        t("pricing.features.prioritySupport"),
        t("pricing.features.customOnboarding"),
      ],
      notIncluded: [],
    },
  ];

  // Calculate days left in trial
  const trialDaysLeft = subscription.trialEndsAt
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const inTrial = subscription.status === "trial" && trialDaysLeft > 0;

  const getButtonText = (planTier: SubscriptionTier) => {
    if (inTrial && planTier === "pro") {
      return t("pricing.keepProAfterTrial");
    }
    if (inTrial && planTier === "family") {
      return t("pricing.switchToFamily");
    }
    if (planTier === "free") return t("pricing.downgradeFree");
    if (planTier === "classroom") return t("pricing.contactSales");
    if (planTier === "pro") return t("pricing.startTrial");
    if (planTier === "family") return t("pricing.startFamilyTrial");
    return t("pricing.choosePlan");
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }

    if (tier === "classroom") {
      setShowClassroomModal(true);
      return;
    }

    setUpgradingTier(tier);
    try {
      const result = await subscription.upgrade(tier, 30);
      if (result.success) {
        toast.success(t("pricing.planActivated", { tier: t(`tiers.${tier}`) }));
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err: any) {
      toast.error(err.message || t("errors.generic"));
    } finally {
      setUpgradingTier(null);
    }
  };
  
  const submitClassroomRequest = async () => {
    if (!classroomForm.schoolName || !classroomForm.contactName || !classroomForm.email) {
      toast.error(t("pricing.pleaseFillRequired"));
      return;
    }
    
    setSendingRequest(true);
    try {
      // Send email via mailto as immediate action
      const subject = encodeURIComponent(`Classroom Plan Request - ${classroomForm.schoolName}`);
      const body = encodeURIComponent(
        `School/Organization: ${classroomForm.schoolName}\n` +
        `Contact Name: ${classroomForm.contactName}\n` +
        `Email: ${classroomForm.email}\n` +
        `Phone: ${classroomForm.phone}\n` +
        `Number of Students: ${classroomForm.students}\n\n` +
        `Message:\n${classroomForm.message || "No additional message"}`
      );
      
      window.open(`mailto:support@anglotec-ai.com?subject=${subject}&body=${body}`, "_blank");
      
      toast.success(t("pricing.classroomRequestSent"));
      setShowClassroomModal(false);
      setClassroomForm({ schoolName: "", contactName: "", email: "", phone: "", students: "16", message: "" });
    } catch {
      toast.error(t("pricing.requestFailed"));
    } finally {
      setSendingRequest(false);
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
              <h1 className="text-lg font-bold text-white leading-tight">{t("app.name")}</h1>
              <p className="text-[10px] text-gray-400">{t("pricing.title")}</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft size={18} className="mr-1" /> {t("nav.dashboard")}
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 pb-24">
        {/* Hero */}
        <div className="text-center mb-10">
          {inTrial ? (
            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 mb-4 text-xs">
              <Clock size={12} className="mr-1" /> {t("pricing.trialDaysLeft", { days: trialDaysLeft })}
            </Badge>
          ) : (
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30 mb-4 text-xs">
              <Star size={12} className="mr-1" /> {t("pricing.tryFree14")}
            </Badge>
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {inTrial ? t("pricing.keepProAccess") : t("pricing.choosePath")}
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            {inTrial
              ? t("pricing.trialActiveDesc")
              : t("pricing.startFreeDesc")}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm ${billingCycle === "monthly" ? "text-white font-semibold" : "text-gray-400"}`}>
              {t("pricing.monthly")}
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
              {t("pricing.yearly")}
            </span>
            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-[10px]">
              {t("pricing.save25")}
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
                      <span className="text-3xl font-bold text-white">{t("pricing.free")}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">
                          {billingCycle === "monthly"
                            ? formatPriceMonthly(plan.monthlyPrice)
                            : formatPriceMonthly(plan.yearlyPrice / 12)}
                        </span>
                        <span className="text-gray-400 text-sm">{t("pricing.perMonth")}</span>
                        {billingCycle === "yearly" && (
                          <p className="text-xs text-green-400 mt-1">
                            {formatPrice(plan.yearlyPrice)} {t("pricing.billedYearly")}
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
                      <Check size={16} className="mr-1" /> {t("pricing.currentPlan")}
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
                      {isLoading ? t("pricing.activating") : buttonText}
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
            <span>{t("pricing.securePrivate")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-blue-400" />
            <span>{t("pricing.cancelAnytime")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Volume2 size={14} className="text-orange-400" />
            <span>{t("pricing.trial14Days")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone size={14} className="text-purple-400" />
            <span>{t("pricing.allDevices")}</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-white text-center mb-6">{t("pricing.faqTitle")}</h3>
          <div className="space-y-3">
            {[
              {
                q: t("pricing.faq1Q"),
                a: t("pricing.faq1A"),
              },
              {
                q: t("pricing.faq2Q"),
                a: t("pricing.faq2A"),
              },
              {
                q: t("pricing.faq3Q"),
                a: t("pricing.faq3A"),
              },
              {
                q: t("pricing.faq4Q"),
                a: t("pricing.faq4A"),
              },
              {
                q: t("pricing.faq5Q"),
                a: t("pricing.faq5A"),
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
          <p>{t("app.family")}</p>
          <p className="mt-1">{t("pricing.supportEmail")}</p>
        </footer>
      </main>

      {/* Classroom Request Modal */}
      {showClassroomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a365d] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t("pricing.classroomRequestTitle")}</h3>
              <button onClick={() => setShowClassroomModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">{t("pricing.classroomRequestDesc")}</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("pricing.schoolName")} *</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={classroomForm.schoolName}
                    onChange={(e) => setClassroomForm({ ...classroomForm, schoolName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-400/50"
                    placeholder={t("pricing.schoolNamePlaceholder")}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("pricing.contactName")} *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={classroomForm.contactName}
                    onChange={(e) => setClassroomForm({ ...classroomForm, contactName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-400/50"
                    placeholder={t("pricing.contactNamePlaceholder")}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("pricing.contactEmail")} *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={classroomForm.email}
                    onChange={(e) => setClassroomForm({ ...classroomForm, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-400/50"
                    placeholder={t("pricing.emailPlaceholder")}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("pricing.contactPhone")}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    value={classroomForm.phone}
                    onChange={(e) => setClassroomForm({ ...classroomForm, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-400/50"
                    placeholder={t("pricing.phonePlaceholder")}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("pricing.numberOfStudents")}</label>
                <select
                  value={classroomForm.students}
                  onChange={(e) => setClassroomForm({ ...classroomForm, students: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400/50"
                >
                  <option value="1-10">1-10 students</option>
                  <option value="11-16">11-16 students</option>
                  <option value="17-30">17-30 students</option>
                  <option value="31-50">31-50 students</option>
                  <option value="50+">50+ students</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("pricing.additionalMessage")}</label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-gray-500" />
                  <textarea
                    value={classroomForm.message}
                    onChange={(e) => setClassroomForm({ ...classroomForm, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-400/50 min-h-[80px] resize-none"
                    placeholder={t("pricing.messagePlaceholder")}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-5">
              <Button
                onClick={() => setShowClassroomModal(false)}
                className="flex-1 h-11 bg-white/10 text-white hover:bg-white/20"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={submitClassroomRequest}
                disabled={sendingRequest}
                className="flex-1 h-11 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90"
              >
                {sendingRequest ? (
                  <Loader2 size={16} className="animate-spin mr-1" />
                ) : (
                  <Mail size={16} className="mr-1" />
                )}
                {sendingRequest ? t("common.sending") : t("pricing.sendRequest")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
