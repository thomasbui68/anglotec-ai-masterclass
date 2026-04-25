import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { localAuth } from "@/lib/local-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Fingerprint, HelpCircle, Mail, Smartphone, CheckCircle, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const webAuthn = useWebAuthn();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "options" | "security" | "biometric" | "reset" | "backup" | "phone">("email");
  const [userRecord, setUserRecord] = useState<any>(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");

  const handleFindAccount = () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Please enter a valid email address"); return; }
    const user = localAuth.findByEmail(email.trim());
    if (!user) { toast.error("We couldn't find an account with that email. Please check and try again."); return; }
    setUserRecord(user);
    setStep("options");
  };

  const handleSecurityCheck = () => {
    if (!securityAnswer.trim()) { toast.error("Please enter your answer"); return; }
    const correct = localAuth.checkSecurityAnswer(email.trim(), securityAnswer.trim());
    if (!correct) { toast.error("That answer doesn't match our records. Please try again."); return; }
    setStep("reset");
    toast.success("Security answer verified! You can now set a new password.");
  };

  const handleBiometricReset = async () => {
    if (!email.trim()) { toast.error("Please enter your email first"); return; }
    setBioLoading(true);
    try {
      const bioData = localAuth.loginBiometric(email.trim());
      if (!bioData.credentialId) { toast.error("Face ID is not set up for this account."); setStep("options"); return; }

      const success = await webAuthn.authenticateBiometric(bioData.credentialId);
      if (!success) { toast.error("Face ID verification failed. Please try again."); return; }

      setStep("reset");
      toast.success("Face ID verified! You can now set a new password.");
    } catch (err: any) {
      toast.error(err.message || "Face ID verification failed.");
    } finally {
      setBioLoading(false);
    }
  };

  const handleSendBackupCode = () => {
    if (!userRecord?.backup_email) { toast.error("No backup email on file."); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    toast.success(`A verification code has been sent to ${userRecord.backup_email}`);
    toast.info(`Your verification code is: ${code} (demo mode)`);
    setStep("backup");
  };

  const handleVerifyBackupCode = () => {
    if (verificationCode.trim() !== sentCode) { toast.error("The code you entered is incorrect."); return; }
    setStep("reset");
    toast.success("Code verified! You can now set a new password.");
  };

  const handleSendPhoneCode = () => {
    if (!userRecord?.phone_number) { toast.error("No phone number on file."); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    toast.success(`A verification code has been sent to ${userRecord.phone_number}`);
    toast.info(`Your verification code is: ${code} (demo mode)`);
    setStep("phone");
  };

  const handleVerifyPhoneCode = () => {
    if (verificationCode.trim() !== sentCode) { toast.error("The code you entered is incorrect."); return; }
    setStep("reset");
    toast.success("Code verified! You can now set a new password.");
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("The passwords don't match. Please try again."); return; }
    try {
      localAuth.resetPassword(email.trim(), newPassword);
      toast.success("Your password has been reset! Please sign in with your new password.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Could not reset password.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/app-icon.png" alt="Anglotec" className="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-white tracking-wide">Anglotec AI</h1>
          <p className="text-orange-400 text-lg font-medium mt-1">Recover Your Account</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white">
          <CardHeader className="pb-0 pt-6">
            <h2 className="text-xl font-semibold text-center text-gray-800">
              {step === "email" && "Forgot Your Password?"}
              {step === "options" && "Choose a Recovery Method"}
              {step === "security" && "Answer Your Security Question"}
              {step === "biometric" && "Verify with Face ID"}
              {step === "backup" && "Enter Verification Code"}
              {step === "phone" && "Enter Verification Code"}
              {step === "reset" && "Create New Password"}
            </h2>
          </CardHeader>
          <CardContent className="pt-4">
            {/* STEP 1: Enter Email */}
            {step === "email" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 text-center">Enter the email for your account and we'll help you recover access.</p>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 text-base" />
                </div>
                <Button onClick={handleFindAccount} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                  <KeyRound className="mr-2 h-5 w-5" /> Find My Account
                </Button>
                <div className="text-center pt-2">
                  <Link to="/login" className="text-sm text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1">
                    <ArrowLeft size={14} /> Back to Sign In
                  </Link>
                </div>
              </div>
            )}

            {/* STEP 2: Recovery Options */}
            {step === "options" && userRecord && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">Account: <strong>{userRecord.email}</strong></p>
                <p className="text-sm text-gray-500 text-center">How would you like to recover?</p>

                {userRecord.credential_id && webAuthn.isReady && (
                  <button onClick={() => setStep("biometric")} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left flex items-center gap-3">
                    <Fingerprint className="text-orange-500 shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-gray-800">Face ID / Fingerprint</p>
                      <p className="text-xs text-gray-500">Use your device's biometric — fastest</p>
                    </div>
                  </button>
                )}

                {userRecord.security_question && (
                  <button onClick={() => setStep("security")} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left flex items-center gap-3">
                    <HelpCircle className="text-orange-500 shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-gray-800">Security Question</p>
                      <p className="text-xs text-gray-500">Answer your recovery question</p>
                    </div>
                  </button>
                )}

                {userRecord.backup_email && (
                  <button onClick={handleSendBackupCode} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left flex items-center gap-3">
                    <Mail className="text-orange-500 shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-gray-800">Backup Email</p>
                      <p className="text-xs text-gray-500">Send code to {userRecord.backup_email}</p>
                    </div>
                  </button>
                )}

                {userRecord.phone_number && (
                  <button onClick={handleSendPhoneCode} className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left flex items-center gap-3">
                    <Smartphone className="text-orange-500 shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-gray-800">Phone Number</p>
                      <p className="text-xs text-gray-500">Send code to {userRecord.phone_number}</p>
                    </div>
                  </button>
                )}

                {!userRecord.credential_id && !userRecord.security_question && !userRecord.backup_email && !userRecord.phone_number && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-yellow-700">No recovery methods set up. Please create a new account.</p>
                  </div>
                )}

                <div className="text-center pt-2">
                  <button onClick={() => setStep("email")} className="text-sm text-gray-500 hover:text-gray-700 font-medium inline-flex items-center gap-1">
                    <ArrowLeft size={14} /> Try a different email
                  </button>
                </div>
              </div>
            )}

            {/* STEP: Security Question */}
            {step === "security" && userRecord && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Answer your security question:</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-800">{userRecord.security_question}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answer">Your Answer</Label>
                  <Input id="answer" type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Type your answer" className="h-12 text-base" />
                  <p className="text-xs text-gray-500">Not case-sensitive.</p>
                </div>
                <Button onClick={handleSecurityCheck} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5" /> Verify Answer
                </Button>
                <Button variant="outline" onClick={() => setStep("options")} className="w-full h-12">Try Another Method</Button>
              </div>
            )}

            {/* STEP: Biometric (Face ID / Fingerprint) */}
            {step === "biometric" && (
              <div className="space-y-4">
                <div className={`p-3 rounded-lg flex items-start gap-2 ${webAuthn.isReady ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                  {webAuthn.isReady ? <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" /> : <AlertCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />}
                  <p className="text-sm text-gray-700">{webAuthn.capabilityMessage}</p>
                </div>
                <p className="text-sm text-gray-500">Tap the button below and use your Face ID or fingerprint to verify your identity.</p>
                <Button onClick={handleBiometricReset} disabled={bioLoading || !webAuthn.isReady} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                  {bioLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                  {bioLoading ? "Verifying..." : "Verify with Face ID"}
                </Button>
                <Button variant="outline" onClick={() => setStep("options")} className="w-full h-12">Try Another Method</Button>
              </div>
            )}

            {/* STEP: Backup Email Code */}
            {step === "backup" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">A 6-digit code was sent to your backup email.</p>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input id="code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="000000" className="h-12 text-base text-center tracking-[0.5em] font-mono" maxLength={6} />
                </div>
                <Button onClick={handleVerifyBackupCode} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">Verify Code</Button>
                <Button variant="outline" onClick={() => setStep("options")} className="w-full h-12">Try Another Method</Button>
              </div>
            )}

            {/* STEP: Phone Code */}
            {step === "phone" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">A 6-digit code was sent to your phone.</p>
                <div className="space-y-2">
                  <Label htmlFor="phone-code">Verification Code</Label>
                  <Input id="phone-code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="000000" className="h-12 text-base text-center tracking-[0.5em] font-mono" maxLength={6} />
                </div>
                <Button onClick={handleVerifyPhoneCode} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">Verify Code</Button>
                <Button variant="outline" onClick={() => setStep("options")} className="w-full h-12">Try Another Method</Button>
              </div>
            )}

            {/* STEP: Reset Password */}
            {step === "reset" && (
              <div className="space-y-4">
                <p className="text-sm text-green-600 text-center font-medium">Identity verified! Create a new password below.</p>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="h-12 text-base pr-12" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2">
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Type it again" className="h-12 text-base pr-12" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2">
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500">Passwords don't match yet.</p>}
                </div>
                <Button onClick={handleResetPassword} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold" disabled={!newPassword || newPassword.length < 6 || newPassword !== confirmPassword}>
                  <KeyRound className="mr-2 h-5 w-5" /> Reset My Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
