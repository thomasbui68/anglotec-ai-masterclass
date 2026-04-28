import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LogIn, Fingerprint, Loader2, Eye, EyeOff, ArrowRight,
  ShieldCheck, AlertCircle, Sparkles, GraduationCap
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelfProtecting } from "@/components/SelfProtectingProvider";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isSupabaseReady } = useAuth();
  const webAuthn = useWebAuthn();
  const protect = useSelfProtecting();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("password");

  // Face ID state
  const [bioLoading, setBioLoading] = useState(false);

  /* ---- Password Login ---- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (protect.isLoginLocked) return;
    if (!protect.canAct("login_submit", 2000)) return; // 2s anti-double-click

    if (!isSupabaseReady) {
      setLoginError(t("errors.supabaseNotConfigured"));
      return;
    }
    if (!email.trim()) { setLoginError(t("errors.enterEmail")); return; }
    if (!password) { setLoginError(t("errors.enterPassword")); return; }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success(t("auth.welcomeBack"));
      navigate("/");
    } catch (err: any) {
      setLoginError(err.message || t("errors.authFailed"));
      protect.recordLoginAttempt();
    } finally {
      setIsLoading(false);
    }
  };

  /* ---- Face ID Login ---- */
  const handleBiometricLogin = async () => {
    if (!isSupabaseReady) {
      setLoginError(t("errors.supabaseNotConfigured"));
      return;
    }
    if (!email.trim()) {
      setLoginError(t("errors.enterEmailFirst"));
      setActiveTab("faceid");
      return;
    }
    setBioLoading(true);
    setLoginError(null);
    try {
      setLoginError(
        t("errors.faceIdRequiresPassword")
      );
      setActiveTab("password");
    } finally {
      setBioLoading(false);
    }
  };

  /* ---- Resend Verification ---- */
  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error(t("errors.enterEmailFirst"));
      return;
    }
    toast.info(t("auth.checkInboxForLink"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <img src="/app-icon.png" alt={t("app.name")} className="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-lg rounded-2xl" />
          <h1 className="text-3xl font-bold text-white tracking-wide">{t("app.name")}</h1>
          <p className="text-orange-400 text-lg font-medium mt-1">{t("app.tagline")}</p>
          <p className="text-gray-300 text-sm mt-2">{t("app.family")}</p>
        </div>

        {/* Masterclass Value Proposition */}
        <div className="bg-gradient-to-r from-[#1a365d] via-[#234a7c] to-[#1a365d] rounded-xl p-4 mb-6 border border-orange-400/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap size={18} className="text-orange-400" />
            <p className="text-orange-400 font-bold text-sm tracking-widest uppercase">{t("masterclass.title")}</p>
          </div>
          <p className="text-white text-sm font-semibold leading-relaxed">
            {t("masterclass.headline")}
          </p>
          <p className="text-gray-300 text-xs mt-1">
            {t("masterclass.subtitle")}
          </p>
        </div>

        {/* Supabase Not Configured Warning */}
        {!isSupabaseReady && (
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 mb-6 text-center">
            <AlertCircle size={20} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-yellow-300 text-sm font-medium">{t("errors.cloudAuthNotConnected")}</p>
            <p className="text-yellow-400/70 text-xs mt-1">
              {t("errors.cloudAuthDesc")}
            </p>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 text-xs underline mt-2 inline-block"
            >
              {t("errors.getStartedSupabase")} →
            </a>
          </div>
        )}

        <Card className="border-0 shadow-2xl bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-xl font-bold text-center text-gray-800 flex items-center justify-center gap-2">
              <LogIn size={22} className="text-orange-500" /> {t("auth.signIn")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Banner */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{loginError}</p>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
                <TabsTrigger value="password" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("auth.password")}</TabsTrigger>
                <TabsTrigger value="faceid" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Fingerprint size={14} className="mr-1" /> Face ID
                </TabsTrigger>
              </TabsList>

              {/* Password Login */}
              <TabsContent value="password">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">{t("auth.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">{t("auth.password")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("auth.enterPassword")}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                        className="h-12 rounded-xl border-gray-200 pr-10 focus:border-orange-400 focus:ring-orange-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold text-base rounded-xl shadow-lg"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <><ArrowRight size={18} className="mr-2" /> {t("auth.signIn")}</>}
                  </Button>
                </form>
              </TabsContent>

              {/* Face ID Login */}
              <TabsContent value="faceid">
                <div className="space-y-4 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <ShieldCheck size={32} className="text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 font-medium">
                      {webAuthn.capabilityMessage}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio-email" className="text-gray-700 font-medium">{t("auth.email")}</Label>
                    <Input
                      id="bio-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl border-gray-200"
                    />
                    <p className="text-xs text-gray-300">
                      {t("auth.faceIdDesc")}
                    </p>
                  </div>
                  <Button
                    onClick={handleBiometricLogin}
                    disabled={bioLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-base rounded-xl"
                  >
                    {bioLoading ? <Loader2 size={20} className="animate-spin" /> : <><Fingerprint size={20} className="mr-2" /> {t("auth.signIn")} {t("auth.withFaceId")}</>}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-center pt-2 border-t">
              <p className="text-gray-300 text-sm">
                {t("auth.noAccount")}{" "}
                <Link to="/register" className="text-orange-600 hover:text-orange-700 font-bold">
                  {t("auth.createAccount")} →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
