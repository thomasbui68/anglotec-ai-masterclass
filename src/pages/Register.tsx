import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Mail, Lock, User, Phone, Shield, CheckCircle, ArrowRight,
  ArrowLeft, Sparkles, Eye, EyeOff, AlertCircle
} from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const auth = useAuth();
  const webAuthn = useWebAuthn();

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
      if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email"); return; }
    }
    if (step === 2) {
      if (!passwordStrong) { setError("Password must be at least 8 characters with uppercase, lowercase, and a number"); return; }
      if (!passwordsMatch) { setError("Passwords do not match"); return; }
      if (!securityQuestion || !securityAnswer) { setError("Please set a security question for account recovery"); return; }
    }
    setStep(step + 1);
  };

  const handleBack = () => { if (step > 1) { setError(null); setStep(step - 1); } };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await auth.register({
        email,
        password,
        displayName: displayName || undefined,
        phone: phone || undefined,
        securityQuestion: securityQuestion || undefined,
        securityAnswer: securityAnswer || undefined,
      });
      setRegistrationComplete(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await auth.resendVerification(email);
      toast.success("Verification email resent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend. Please try again.");
    }
  };

  // Progress dots
  const steps = [
    { num: 1, label: "Email" },
    { num: 2, label: "Password" },
    { num: 3, label: "Profile" },
    { num: 4, label: "Review" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/app-icon.png" alt="Anglotec" className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-lg rounded-2xl" />
          <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
          <p className="text-gray-400 text-sm">Join the Anglotec AI Masterclass</p>
        </div>

        {/* Masterclass Banner */}
        <div className="bg-gradient-to-r from-[#1a365d] via-[#234a7c] to-[#1a365d] rounded-xl p-4 mb-6 border border-orange-400/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={14} className="text-orange-400" />
            <p className="text-orange-400 font-bold text-xs tracking-widest uppercase">ANGLOTEC AI MASTERCLASS</p>
            <Sparkles size={14} className="text-orange-400" />
          </div>
          <p className="text-white text-xs leading-relaxed">
            You're joining <span className="font-bold text-orange-300">3,000 AI Prompting Phrases</span> across 12 expert categories.
          </p>
        </div>

        {/* Step Indicator */}
        {!registrationComplete && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s.num ? "bg-orange-500 text-white" :
                  step > s.num ? "bg-green-500 text-white" : "bg-white/10 text-gray-400"
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
            <button onClick={handleBack} className={`text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors ${step === 1 ? "invisible" : ""}`}>
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={() => navigate("/login")} className="text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        )}

        {/* Registration Complete */}
        {registrationComplete ? (
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Verify Your Email</h3>
                <p className="text-gray-500 text-sm mt-2">
                  We've sent a verification link to <strong>{email}</strong>
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-800 font-medium mb-2">Next steps:</p>
                <ol className="text-sm text-blue-700 space-y-1.5 list-decimal pl-4">
                  <li>Check your inbox for the verification email</li>
                  <li>Click the "Verify Email" button in the email</li>
                  <li>Return here and sign in with your password</li>
                </ol>
              </div>
              <div className="space-y-3">
                <Button onClick={handleResend} variant="outline" className="w-full h-12">
                  Resend Verification Email
                </Button>
                <Button onClick={() => navigate("/login")} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  Go to Sign In
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Didn't receive it? Check your spam folder or click Resend above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step 1: Email */}
            {step === 1 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail size={20} className="text-orange-500" /> Your Email</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" required />
                    <p className="text-xs text-gray-500">We'll send a verification link to this email.</p>
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">Continue <ArrowRight size={18} className="ml-2" /></Button>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account? <Link to="/login" className="text-orange-600 font-bold">Sign In</Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lock size={20} className="text-orange-500" /> Create Password</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Min 8 chars, upper, lower, number" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pr-10" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    {password && (
                      <div className="space-y-1 text-xs">
                        <p className={password.length >= 8 ? "text-green-600" : "text-gray-400"}><CheckCircle size={12} className="inline mr-1" /> 8+ characters</p>
                        <p className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}><CheckCircle size={12} className="inline mr-1" /> Uppercase letter</p>
                        <p className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-400"}><CheckCircle size={12} className="inline mr-1" /> Lowercase letter</p>
                        <p className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-400"}><CheckCircle size={12} className="inline mr-1" /> Number</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 pr-10" />
                      <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    {confirmPassword && (passwordsMatch ? <p className="text-xs text-green-600">Passwords match!</p> : <p className="text-xs text-red-500">Passwords do not match</p>)}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Shield size={14} /> Security Question</Label>
                    <Input placeholder="e.g., What was your first pet's name?" value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} className="h-12" />
                    <Input placeholder="Your answer (used for account recovery)" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} className="h-12" />
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">Continue <ArrowRight size={18} className="ml-2" /></Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Profile */}
            {step === 3 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User size={20} className="text-orange-500" /> Your Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Name <span className="text-gray-400">(optional)</span></Label>
                    <Input placeholder="How should we call you?" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone size={14} /> Phone <span className="text-gray-400">(optional)</span></Label>
                    <Input type="tel" placeholder="+1 234 567 8900" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
                    <p className="text-xs text-gray-500">For account recovery and two-factor authentication.</p>
                  </div>
                  <Button onClick={handleNext} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold">Continue <ArrowRight size={18} className="ml-2" /></Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Create */}
            {step === 4 && (
              <Card className="border-0 shadow-2xl">
                <CardHeader><CardTitle className="text-lg">Review Your Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{email}</span></div>
                    {displayName && <div className="flex justify-between"><span className="text-gray-500">Display Name</span><span className="font-medium">{displayName}</span></div>}
                    {phone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{phone}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Security</span><span className="font-medium">{securityQuestion ? "Set" : "Not set"}</span></div>
                  </div>
                  <p className="text-xs text-gray-500">By creating an account, you agree to our Terms of Service and Privacy Policy.</p>
                  <Button onClick={handleRegister} disabled={isLoading} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-lg">
                    {isLoading ? "Creating Account..." : "Create My Account"}
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
