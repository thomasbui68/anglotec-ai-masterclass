import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LogIn, Loader2, Eye, EyeOff, ArrowRight, Users,
  AlertCircle, Sparkles, GraduationCap
} from "lucide-react";
import { useTranslation } from "@/i18n";
import { useSelfProtecting } from "@/components/SelfProtectingProvider";
import { useDemoLogin } from "@/hooks/useDemoLogin";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const protect = useSelfProtecting();
  const demo = useDemoLogin();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  /* ---- Password Login ---- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (protect.isLoginLocked) return;
    if (!protect.canAct("login_submit", 2000)) return;

    if (!email.trim()) { setLoginError(t("errors.enterEmail")); return; }
    if (!password) { setLoginError(t("errors.enterPassword")); return; }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success(t("auth.welcomeBack"));

      // Check for pending checkout tier (after Stripe payment)
      const pendingTier = localStorage.getItem("pending_checkout_tier") as "pro" | "family" | "classroom" | null;
      if (pendingTier) {
        localStorage.removeItem("pending_checkout_tier");
        toast.success(t("demo.paymentConfirmed", { tier: pendingTier.toUpperCase() }));
        setTimeout(() => navigate("/settings?checkout=success&tier=" + pendingTier), 1500);
        return;
      }

      navigate("/");
    } catch (err: any) {
      setLoginError(err.message || t("errors.authFailed"));
      protect.recordLoginAttempt();
    } finally {
      setIsLoading(false);
    }
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

        {/* Social Proof Bar */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
            <Users size={16} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">{t("pricing.joinLearners")}</span>
          </div>
        </div>

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

            {/* Password Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
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

        {/* ── Try Demo Buttons ── */}
        <div className="mt-4 space-y-3">
          <button
            onClick={() => demo.login({ tier: "free", welcomeMessage: "Welcome! You're using the Free demo." })}
            disabled={demo.isLoading}
            className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-400/30 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {demo.isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <><Sparkles size={18} className="text-orange-400" /> {t("demo.tryFree")}</>
            )}
          </button>

          <button
            onClick={() => demo.login({ tier: "pro", welcomeMessage: "Welcome! You're using the Pro demo with all features unlocked." })}
            disabled={demo.isLoading}
            className="w-full h-12 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-400/20 hover:border-purple-400/40 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {demo.isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <><GraduationCap size={18} className="text-purple-400" /> {t("demo.tryPro")}</>
            )}
          </button>

          <p className="text-center text-gray-300 text-xs">
            {t("demo.description")}
          </p>
        </div>
      </div>
    </div>
  );
}
