import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail, Lock, User, Phone, Shield, CheckCircle, ArrowRight,
  ArrowLeft, Sparkles, Eye, EyeOff, AlertCircle
} from "lucide-react";
import { useTranslation } from "@/i18n";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();

  // Form state
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!email.trim() || !email.includes("@")) { setError(t("errors.invalidEmail")); return; }
    }
    if (step === 2) {
      if (!passwordStrong) { setError(t("errors.passwordRequirements")); return; }
      if (!passwordsMatch) { setError(t("auth.passwordsNoMatch")); return; }
      if (!securityQuestion || !securityAnswer) { setError(t("errors.securityQuestionRequired")); return; }
    }
    setStep(step + 1);
  };

  const handleBack = () => { if (step > 1) { setError(null); setStep(step - 1); } };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auth.register({
        email,
        password,
        displayName: displayName || undefined,
        phone: phone || undefined,
        securityQuestion: securityQuestion || undefined,
        securityAnswer: securityAnswer || undefined,
      });
      setRegistrationComplete(true);
    } catch (err: any) {
      setError(err.message || t("errors.registerFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, label: t("auth.email") },
    { num: 2, label: t("auth.password") },
    { num: 3, label: t("auth.profile") },
    { num: 4, label: t("common.confirm") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/app-icon.png" alt={t("app.name")} className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-lg rounded-2xl" />
          <h1 className="text-2xl font-bold text-white">{t("auth.createAccount")}</h1>
          <p className="text-gray-300 text-sm">{t("auth.joinMasterclass")}</p>
        </div>

        {/* Masterclass Banner */}
        <div className="bg-gradient-to-r from-[#1a365d] via-[#234a7c] to-[#1a365d] rounded-xl p-4 mb-6 border border-orange-400/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={14} className="text-orange-400" />
            <p className="text-orange-400 font-bold text-xs tracking-widest uppercase">{t("masterclass.title")}</p>
            <Sparkles size={14} className="text-orange-400" />
          </div>
          <p className="text-white text-xs leading-relaxed">
            {t("auth.joiningPrompts")}
          </p>
        </div>

        {/* Step Indicator */}
        {!registrationComplete && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s.num ? "bg-orange-500 text-white" :
                  step > s.num ? "bg-green-500 text-white" : "bg-white/10 text-gray-300"
                }`}>
                  {step > s.num ? <CheckCircle size={16} /> : s.num}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 rounded ${step > s.num ? "bg-green-500" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Back / Cancel */}
        {!registrationComplete && (
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleBack} className={`text-sm text-gray-300 hover:text-white flex items-center gap-1 transition-colors ${step === 1 ? "invisible" : ""}`}>
              <ArrowLeft size={16} /> {t("common.back")}
            </button>
            <button onClick={() => navigate("/login")} className="text-sm text-gray-300 hover:text-white transition-colors">
              {t("common.cancel")}
            </button>
          </div>
        )}

        {/* Registration Complete — always auto-logged in, no email verification */}
        {registrationComplete ? (
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Account Created!</h3>
                <p className="text-gray-500 text-sm mt-2">
                  Welcome to Anglotec AI Masterclass. You are now logged in and ready to start learning.
                </p>
              </div>
              <Button onClick={() => navigate("/")} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                Start Learning &rarr;
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step 1: Email */}
            {step === 1 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail size={20} className="text-orange-500" /> {t("auth.yourEmail")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("auth.email")}</Label>
                    <Input type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" required />
                    <p className="text-xs text-gray-300">{t("auth.verificationLinkSent")}</p>
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">{t("common.continue")} <ArrowRight size={18} className="ml-2" /></Button>
                  <p className="text-center text-sm text-gray-300">
                    {t("auth.hasAccount")} <Link to="/login" className="text-orange-600 font-bold">{t("nav.login")}</Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lock size={20} className="text-orange-500" /> {t("auth.createPassword")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("auth.password")}</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder={t("auth.passwordRequirements")} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pr-10" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-300" type="button">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    {password && (
                      <div className="space-y-1 text-xs">
                        <p className={password.length >= 8 ? "text-green-600" : "text-gray-300"}><CheckCircle size={12} className="inline mr-1" /> {t("auth.req8Chars")}</p>
                        <p className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-300"}><CheckCircle size={12} className="inline mr-1" /> {t("auth.reqUppercase")}</p>
                        <p className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-300"}><CheckCircle size={12} className="inline mr-1" /> {t("auth.reqLowercase")}</p>
                        <p className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-300"}><CheckCircle size={12} className="inline mr-1" /> {t("auth.reqNumber")}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("auth.confirmPassword")}</Label>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder={t("auth.reEnterPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 pr-10" />
                      <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-300" type="button">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    {confirmPassword && (passwordsMatch ? <p className="text-xs text-green-600">{t("auth.passwordsMatch")}</p> : <p className="text-xs text-red-500">{t("auth.passwordsNoMatch")}</p>)}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Shield size={14} /> {t("auth.securityQuestion")}</Label>
                    <Input placeholder={t("auth.securityQuestionExample")} value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} className="h-12" />
                    <Input placeholder={t("auth.securityAnswerExample")} value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} className="h-12" />
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">{t("common.continue")} <ArrowRight size={18} className="ml-2" /></Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Profile */}
            {step === 3 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User size={20} className="text-orange-500" /> {t("auth.yourProfile")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("auth.displayName")} <span className="text-gray-300">({t("common.optional")})</span></Label>
                    <Input placeholder={t("auth.displayName")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone size={14} /> {t("auth.phone")} <span className="text-gray-300">({t("common.optional")})</span></Label>
                    <Input type="tel" placeholder={t("auth.phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
                    <p className="text-xs text-gray-300">{t("auth.phoneDesc")}</p>
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">{t("common.continue")} <ArrowRight size={18} className="ml-2" /></Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Create */}
            {step === 4 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg">{t("common.confirm")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-300">{t("auth.email")}</span><span className="font-medium">{email}</span></div>
                    {displayName && <div className="flex justify-between"><span className="text-gray-300">{t("auth.displayName")}</span><span className="font-medium">{displayName}</span></div>}
                    {phone && <div className="flex justify-between"><span className="text-gray-300">{t("auth.phone")}</span><span className="font-medium">{phone}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-300">{t("auth.securityQuestion")}</span><span className="font-medium">{securityQuestion ? t("common.set") : t("common.notSet")}</span></div>
                  </div>
                  <p className="text-xs text-gray-300">{t("pricing.terms")}</p>
                  <Button onClick={handleRegister} disabled={isLoading} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-lg">
                    {isLoading ? t("common.loading") : t("auth.createAccount")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
