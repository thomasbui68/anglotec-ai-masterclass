import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useKokoroTTS } from "@/hooks/useKokoroTTS";
import { useSubscription, type SubscriptionTier } from "@/hooks/useSubscription";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Trash2, Shield, Info, Loader2,
  CheckCircle, Mail, ShieldCheck, Play,
  Crown, Clock, Zap, CreditCard, Sparkles
} from "lucide-react";
import { useTranslation } from "@/i18n";

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const tts = useKokoroTTS();
  const subscription = useSubscription();

  const trialDaysLeft = subscription.trialEndsAt
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const inTrial = subscription.status === "trial" && trialDaysLeft > 0;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle Stripe checkout return — HashRouter stores params in hash fragment
  useEffect(() => {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");
    if (queryIndex === -1) return;

    const queryString = hash.slice(queryIndex + 1);
    const params = new URLSearchParams(queryString);
    const checkout = params.get("checkout");
    const tier = params.get("tier") as SubscriptionTier | null;

    if (checkout === "success" && tier) {
      subscription.upgrade(tier, 30).then(() => {
        toast.success(t("pricing.paymentSuccess"));
        const cleanHash = hash.slice(0, queryIndex);
        window.location.hash = cleanHash;
        setTimeout(() => window.location.reload(), 1500);
      });
    } else if (checkout === "cancelled") {
      toast.info(t("pricing.paymentCancelled"));
      const cleanHash = hash.slice(0, queryIndex);
      window.location.hash = cleanHash;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-6">
        <div className="text-white text-center max-w-sm">
          <Info size={48} className="mx-auto mb-4 text-orange-400" />
          <h2 className="text-xl font-bold mb-2">{t("settings.pleaseSignIn")}</h2>
          <p className="text-gray-300 mb-6">{t("settings.signInRequired")}</p>
          <Button onClick={() => navigate("/login")} className="bg-orange-500 hover:bg-orange-600 h-12 px-6">
            {t("settings.goToSignIn")}
          </Button>
        </div>
      </div>
    );
  }

  const handleDeleteAccount = async () => {
    try {
      // Delete user via Supabase Edge Function (server-side has service role)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          toast.success(t("settings.accountDeleted"));
        } else {
          // Fallback: sign out client-side, data will be cleaned up server-side
          toast.info(t("settings.deleteRequestSent"));
        }
      }
    } catch {
      // Edge function not available — just sign out
    } finally {
      await logout();
      toast.success(t("settings.accountLoggedOut"));
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec" className="h-10 w-10 object-contain drop-shadow-lg rounded-xl" />
            <div>
              <h1 className="text-base font-bold tracking-wide text-white">{t("app.name")}</h1>
              <p className="text-xs text-orange-400">{t("settings.title")}</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft size={18} className="mr-1" /> {t("nav.dashboard")}
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Account Info */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Mail size={20} className="text-orange-500" /> {t("settings.accountInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-gray-300 text-sm">{t("auth.email")}</span>
              <span className="font-semibold text-white">{user.email}</span>
            </div>
            {user?.backupEmail && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-300 text-sm">{t("settings.backupEmail")}</span>
                <span className="font-semibold text-[#1a365d]">{user.backupEmail}</span>
              </div>
            )}
            {user?.phoneNumber && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-300 text-sm">{t("auth.phone")}</span>
                <span className="font-semibold text-[#1a365d]">{user.phoneNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-300 text-sm">{t("settings.emailStatus")}</span>
              <Badge className={user?.emailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                {user?.emailVerified ? <><CheckCircle size={12} className="mr-1" /> {t("settings.verified")}</> : t("settings.unverified")}
              </Badge>
            </div>
            {user?.securityQuestion && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-300 text-sm">{t("settings.recoveryQuestion")}</span>
                <Badge className="bg-green-100 text-green-700"><CheckCircle size={12} className="mr-1" /> {t("common.set")}</Badge>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300 text-sm">{t("settings.accountType")}</span>
              <span className={`font-semibold ${user?.email?.toLowerCase() === "thomasb@anglotec.com" ? "text-purple-600" : "text-[#1a365d]"}`}>
                {user?.email?.toLowerCase() === "thomasb@anglotec.com" ? t("tiers.admin") : t("tiers.learner")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown size={20} className="text-orange-500" /> {t("settings.yourPlan")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current plan status */}
            <div className={`p-4 rounded-xl ${
              subscription.isPaid
                ? "bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200"
                : inTrial
                ? "bg-green-50 border border-green-200"
                : "bg-gray-50 border border-gray-200"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  subscription.isPaid ? "bg-orange-500" : inTrial ? "bg-green-500" : "bg-gray-400"
                }`}>
                  <Crown size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#1a365d]">
                    {t(`tiers.${subscription.tier}`)}
                    {subscription.isPaid && (
                      <Badge className="ml-2 bg-orange-100 text-orange-700 text-[10px]">
                        <Zap size={10} className="mr-0.5" /> {t("settings.active")}
                      </Badge>
                    )}
                    {inTrial && (
                      <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">
                        <Clock size={10} className="mr-0.5" /> {t("settings.trial")}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-300">
                    {subscription.isPaid
                      ? t("settings.unlimitedAccess")
                      : inTrial
                      ? t("settings.trialDaysLeft", { days: trialDaysLeft })
                      : t("settings.promptsPerDay20")}
                  </p>
                </div>
              </div>

              {inTrial && (
                <p className="text-xs text-green-700 mt-2 bg-white/50 p-2 rounded-lg">
                  {t("settings.trialDesc")}
                </p>
              )}
            </div>

            {/* Plan features */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t("settings.included")}</p>
              {subscription.tier === "free" ? (
                <>
                  {[t("settings.feature20Prompts"), t("settings.feature6Categories"), t("settings.featureLocalTracking")].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500" /> {f}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[t("settings.featureUnlimited"), t("settings.feature12Categories"), t("settings.featureVoice"), t("settings.featureSync"), t("settings.featureWeekly")].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500" /> {f}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => navigate("/pricing")}
                className="bg-orange-500 hover:bg-orange-600 text-white h-11"
              >
                <CreditCard size={18} className="mr-2" />
                {inTrial ? t("settings.choosePlan") : subscription.tier === "free" ? t("settings.upgradePro") : t("settings.changePlan")}
              </Button>
              {subscription.tier !== "free" && !subscription.isAdmin && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const data = await subscription.openCustomerPortal();
                      if (data.url) window.location.href = data.url;
                    } catch (err: any) {
                      toast.error(err.message || t("settings.couldNotOpenBilling"));
                    }
                  }}
                  className="h-11 border-gray-300 text-gray-600"
                >
                  <CreditCard size={18} className="mr-2" />
                  {t("settings.manageSubscription")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voice & Audio — Browser TTS (100% Free) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" /> {t("settings.voiceAudio")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Voice status banner */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 ${
              tts.isReady
                ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200"
                : tts.isLoading
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                  : "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
            }`}>
              <Sparkles size={18} className={`shrink-0 mt-0.5 ${tts.isReady ? "text-purple-600" : tts.isLoading ? "text-yellow-600" : "text-blue-600"}`} />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {tts.isReady ? t("settings.premiumVoiceActive") : tts.isLoading ? "Loading Premium AI Voice..." : t("settings.browserVoiceActive")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tts.isReady ? "Kokoro AI Neural Voice (82M params)" : tts.isLoading ? `Downloading... ${tts.progress}%` : "Browser voice fallback"}
                </p>
              </div>
            </div>

            {/* AI Voice character selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t("settings.voiceCharacter")}</label>
              <select
                value={tts.currentVoice || "af_bella"}
                onChange={(e) => tts.selectVoice(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {tts.availableVoices.map((voiceId: string) => (
                  <option key={voiceId} value={voiceId}>
                    {tts.voiceNames[voiceId]?.name || voiceId}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400">
                Powered by Kokoro TTS — Open-source neural voice
              </p>
            </div>



            {/* Test Voice Button */}
            <Button
              onClick={() => tts.speak("Welcome to Anglotec AI Masterclass. Let's learn some amazing AI prompts together.")}
              disabled={tts.isSpeaking}
              variant="outline"
              className="w-full h-12 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl"
            >
              {tts.isSpeaking ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {tts.isSpeaking ? t("flashcards.playing") : t("settings.testVoice")}
            </Button>

            {tts.error && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">{tts.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield size={20} className="text-orange-500" /> {t("settings.privacySecurity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                {t("settings.privacyDesc")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <Trash2 size={20} /> {t("settings.deleteAccount")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("settings.deleteAccountDesc")}
            </p>
            {!showDeleteConfirm ? (
              <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="border-red-300 text-red-600 hover:bg-red-50 h-12">
                {t("settings.deleteMyAccount")}
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-red-700 font-medium">{t("settings.deleteConfirm")}</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-12">{t("common.cancel")}</Button>
                  <Button onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white h-12">
                    <Trash2 className="mr-2 h-5 w-5" /> {t("settings.yesDeleteEverything")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Panel — only visible to admin users */}
        {(user?.isAdmin || user?.email?.toLowerCase() === "thomasb@anglotec.com") && (
          <Card className="border-purple-300 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                <ShieldCheck size={20} /> {t("settings.adminControls")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-purple-600">
                {t("settings.adminDesc")}
              </p>
              <div className="bg-white rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-gray-300 uppercase">{t("settings.viewAs")}</p>
                <p className="text-xs text-gray-300">
                  {t("settings.viewAsDesc")}
                </p>
                <div className="flex gap-2">
                  {(["free", "pro", "family", "classroom"] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => {
                        localStorage.setItem("admin_view_tier", tier);
                        toast.success(t("settings.viewingAs", { tier: tier.toUpperCase() }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                        (localStorage.getItem("admin_view_tier") || "pro") === tier
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("admin_view_tier");
                    toast.success(t("settings.resetAdmin"));
                  }}
                  className="text-xs text-purple-600 underline mt-1"
                >
                  {t("settings.resetAdmin")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
