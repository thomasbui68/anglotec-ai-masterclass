import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle, Shield, Mail, Smartphone, Fingerprint, ShieldCheck, AlertCircle } from "lucide-react";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite book?",
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const webAuthn = useWebAuthn();

  const verifyMutation = trpc.auth.verifyEmail.useMutation();
  const bioRegisterMutation = trpc.auth.registerBiometric.useMutation();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    backup_email: "",
    phone_number: "",
    security_question: SECURITY_QUESTIONS[0],
    security_answer: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupBio, setSetupBio] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);
  const [step, setStep] = useState(1);
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [createdUserEmail, setCreatedUserEmail] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const canProceed = () => {
    if (step === 1) return form.email.includes("@");
    if (step === 2) return form.password.length >= 6 && form.password === form.confirmPassword && form.security_answer.trim().length > 0;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Your passwords don't match. Please check and try again."); return; }
    if (form.password.length < 6) { toast.error("Your password must be at least 6 characters long."); return; }
    if (!form.security_answer.trim()) { toast.error("Please answer your security question for account recovery."); return; }

    setIsLoading(true);
    try {
      let credentialId: string | undefined;

      // Register biometric (Face ID / fingerprint) if requested
      if (setupBio && webAuthn.isReady) {
        setBioRegistering(true);
        toast.info("Please use your Face ID or fingerprint when prompted...");
        const credId = await webAuthn.registerBiometric(form.email.trim());
        if (credId) {
          credentialId = credId;
          toast.success("Face ID registered successfully!");
        } else {
          toast.warning("Face ID setup was cancelled. You can set it up later in Settings.");
        }
        setBioRegistering(false);
      }

      const result = await register({
        email: form.email.trim(),
        password: form.password,
        backupEmail: form.backup_email.trim() || undefined,
        phoneNumber: form.phone_number.trim() || undefined,
        securityQuestion: form.security_question,
        securityAnswer: form.security_answer.trim(),
      });

      // If we got a credentialId from WebAuthn, register it with the backend
      if (credentialId) {
        try {
          await bioRegisterMutation.mutateAsync({ credentialId });
        } catch {
          toast.warning("Could not save biometric credential to server.");
        }
      }

      setCreatedUserEmail(form.email.trim());
      setGeneratedCode(result.verificationCode || "");
      setShowEmailVerify(true);
      toast.success("Account created! Please verify your email.");
      if (result.verificationCode) {
        toast.info(`Your verification code is: ${result.verificationCode} (in production this would be sent to your email)`);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (verifyCode.trim().length < 6) { toast.error("Please enter the 6-digit code."); return; }
    try {
      await verifyMutation.mutateAsync({ email: createdUserEmail, code: verifyCode.trim() });
      setShowEmailVerify(false);
      toast.success("Email verified! Welcome to Anglotec AI Master Class.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Verification failed. Please try again.");
    }
  };

  if (showEmailVerify) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/app-icon.png" alt="Anglotec" className="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-white tracking-wide">Anglotec AI</h1>
            <p className="text-orange-400 text-lg font-medium mt-1">Verify Your Email</p>
          </div>
          <Card className="border-0 shadow-2xl bg-white">
            <CardContent className="pt-6 pb-6 space-y-4">
              <p className="text-sm text-gray-500 text-center">We sent a 6-digit verification code to <strong>{createdUserEmail}</strong>.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 text-center">Demo mode: Your code is <strong>{generatedCode}</strong></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifyCode">Enter Verification Code</Label>
                <Input id="verifyCode" type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="000000" className="h-12 text-base text-center tracking-[0.5em] font-mono" maxLength={6} />
              </div>
              <Button onClick={handleVerifyEmail} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold" disabled={verifyCode.length < 6 || verifyMutation.isPending}>
                {verifyMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                {verifyMutation.isPending ? "Verifying..." : "Verify Email"}
              </Button>
              <Button variant="outline" onClick={() => { setShowEmailVerify(false); navigate("/"); }} className="w-full h-12">Skip for Now</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/app-icon.png" alt="Anglotec" className="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-white tracking-wide">Anglotec AI</h1>
          <p className="text-orange-400 text-lg font-medium mt-1">Create Your Account</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white">
          <CardHeader className="pb-0 pt-6">
            <h2 className="text-xl font-semibold text-center text-gray-800">Get Started in 4 Easy Steps</h2>
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${s === step ? "bg-orange-500 text-white" : s < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {s < step ? <CheckCircle size={16} /> : s}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: Email */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Your Email <span className="text-red-500">*</span></Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="h-12 text-base" />
                    <p className="text-xs text-gray-500">This is what you'll use to sign in. We never share your email.</p>
                  </div>
                  <Button type="button" onClick={() => setStep(2)} disabled={!canProceed()} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base">
                    Continue <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                  </Button>
                </>
              )}

              {/* STEP 2: Password + Security */}
              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Create a Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Min 6 characters" className="h-12 text-base pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} placeholder="Type your password again" className="h-12 text-base pr-12" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2">
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-xs text-red-500">Passwords don't match yet.</p>}
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-orange-500" />
                      <p className="text-sm font-medium text-gray-800">Security Question (for recovery)</p>
                    </div>
                    <Select value={form.security_question} onValueChange={(v) => setForm((p) => ({ ...p, security_question: v }))}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTIONS.map((q) => (<SelectItem key={q} value={q}>{q}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <div className="space-y-1">
                      <Label htmlFor="security_answer">Your Answer <span className="text-red-500">*</span></Label>
                      <Input id="security_answer" name="security_answer" type="text" value={form.security_answer} onChange={handleChange} placeholder="Type your answer here" className="h-12 text-base" autoComplete="off" />
                      <p className="text-xs text-gray-500">You'll need this if you forget your password.</p>
                    </div>
                    <div className="space-y-1">
                      {!form.password && <p className="text-xs text-orange-600">Please enter a password (min 6 characters)</p>}
                      {form.password && form.password.length < 6 && <p className="text-xs text-orange-600">Password must be at least 6 characters</p>}
                      {form.password.length >= 6 && form.confirmPassword && form.password !== form.confirmPassword && <p className="text-xs text-red-500">Passwords don't match yet</p>}
                      {form.password.length >= 6 && form.password === form.confirmPassword && <p className="text-xs text-green-600">Passwords match</p>}
                      {!form.security_answer.trim() && (form.password.length >= 6) && <p className="text-xs text-orange-600">Please answer the security question above</p>}
                      {form.security_answer.trim() && <p className="text-xs text-green-600">Security answer saved</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12"><ArrowLeft size={16} className="mr-1" /> Back</Button>
                    <Button type="button" onClick={() => setStep(3)} disabled={!canProceed()} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">Continue</Button>
                  </div>
                </>
              )}

              {/* STEP 3: Backup Info */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Mail size={16} className="text-orange-500" />
                      <Label htmlFor="backup_email">Backup Email <span className="text-gray-400 font-normal">(optional)</span></Label>
                    </div>
                    <Input id="backup_email" name="backup_email" type="email" value={form.backup_email} onChange={handleChange} placeholder="backup@example.com" className="h-12 text-base" />
                    <p className="text-xs text-gray-500">Used to recover your account if you lose access.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Smartphone size={16} className="text-orange-500" />
                      <Label htmlFor="phone_number">Phone Number <span className="text-gray-400 font-normal">(optional)</span></Label>
                    </div>
                    <Input id="phone_number" name="phone_number" type="tel" value={form.phone_number} onChange={handleChange} placeholder="+1 234 567 8900" className="h-12 text-base" />
                    <p className="text-xs text-gray-500">For recovery via SMS verification code.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12"><ArrowLeft size={16} className="mr-1" /> Back</Button>
                    <Button type="button" onClick={() => setStep(4)} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">Continue</Button>
                  </div>
                </>
              )}

              {/* STEP 4: Native Face ID / Biometric */}
              {step === 4 && (
                <>
                  <div className={`p-3 rounded-lg flex items-start gap-2 ${webAuthn.isReady ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    {webAuthn.isReady ? <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" /> : <AlertCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{webAuthn.isReady ? "Face ID Available" : "Face ID Not Available"}</p>
                      <p className="text-xs text-gray-600">{webAuthn.capabilityMessage}</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Fingerprint className="text-orange-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">Set Up Face ID / Fingerprint</p>
                        <p className="text-xs text-gray-600 mt-1">Log in instantly using your device's built-in Face ID or fingerprint. No passwords needed. Only one biometric credential per account.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox id="setupBio" checked={setupBio} onCheckedChange={(checked) => setSetupBio(checked === true)} disabled={!webAuthn.isReady} />
                      <Label htmlFor="setupBio" className={`text-sm cursor-pointer ${!webAuthn.isReady ? "text-gray-400" : ""}`}>
                        {webAuthn.isReady ? "Yes, set up Face ID for quick login" : "Your device doesn't support Face ID"}
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1 h-12"><ArrowLeft size={16} className="mr-1" /> Back</Button>
                    <Button type="submit" className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base" disabled={isLoading || bioRegistering}>
                      {isLoading || bioRegistering ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                      {bioRegistering ? "Setting up Face ID..." : isLoading ? "Creating..." : "Create My Account"}
                    </Button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-gray-500 text-sm">
                Already have an account? <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-xs mt-6">Your account is securely stored on our cloud servers.</p>
      </div>
    </div>
  );
}
