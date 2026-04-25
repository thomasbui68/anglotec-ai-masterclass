import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogIn, Fingerprint, Loader2, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const webAuthn = useWebAuthn();

  const biometricLoginMutation = trpc.auth.biometricLogin.useMutation();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("password");
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (loginError) setLoginError(null);
  };
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (loginError) setLoginError(null);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email.trim()) {
      setLoginError("Please enter your email address.");
      return;
    }
    if (!email.includes("@")) {
      setLoginError("Please enter a valid email address (e.g., you@example.com).");
      return;
    }
    if (!password) {
      setLoginError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      const msg = err.message || "Login failed. Please try again.";
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email.trim()) {
      setLoginError("Please enter your email first.");
      return;
    }
    if (!email.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    setBioLoading(true);
    setLoginError(null);
    try {
      const credentialId = await utils.client.auth.getBiometricCredential.query({ email: email.trim() });
      if (!credentialId) {
        setLoginError("Face ID is not set up for this account. Please sign in with your password first.");
        setActiveTab("password");
        return;
      }

      const success = await webAuthn.authenticateBiometric(credentialId);
      if (!success) {
        setLoginError("Face ID verification failed. Please try again or use your password.");
        return;
      }

      await biometricLoginMutation.mutateAsync({ email: email.trim() });
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      const msg = err.message || "Face ID login failed. Please try again or use your password.";
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setBioLoading(false);
    }
  };

  const isBioAvailable = webAuthn.isReady;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img src="/app-icon.png" alt="Anglotec" className="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-white tracking-wide">Anglotec AI</h1>
          <p className="text-orange-400 text-lg font-medium mt-1">AI Master Class</p>
          <p className="text-gray-400 text-sm mt-2">Part of the Anglotec AI Apps Family</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white">
          <CardHeader className="pb-0 pt-6">
            <h2 className="text-xl font-semibold text-center text-gray-800">Sign In to Your Account</h2>
            <p className="text-center text-gray-500 text-sm mt-1">Welcome back! Let's continue your AI journey.</p>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1">
                <TabsTrigger value="password" className="text-sm">Password</TabsTrigger>
                <TabsTrigger value="face" className="text-sm">
                  <Fingerprint size={14} className="mr-1" /> Face ID
                </TabsTrigger>
              </TabsList>

              {/* Password Login */}
              <TabsContent value="password">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} placeholder="you@example.com" className="h-12 text-base" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-orange-600 hover:text-orange-700 font-medium">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => handlePasswordChange(e.target.value)} placeholder="Enter your password" className="h-12 text-base pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{loginError}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                    {isLoading ? "Signing you in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Face ID Login */}
              <TabsContent value="face">
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg flex items-start gap-2 ${isBioAvailable ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    {isBioAvailable ? <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" /> : <AlertCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />}
                    <p className="text-xs text-gray-700">
                      {webAuthn.capabilityMessage}
                      {!isBioAvailable && " You can still log in with your password."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="face-email" className="text-sm font-medium">Your Email</Label>
                    <Input id="face-email" type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} placeholder="Enter your email first" className="h-12 text-base" />
                    <p className="text-xs text-gray-500">
                      {isBioAvailable
                        ? "Tap the button below and use your Face ID or fingerprint to sign in instantly."
                        : "This browser doesn't support biometric login. Try Safari on iPhone or Chrome on Android."}
                    </p>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{loginError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleBiometricLogin}
                    disabled={bioLoading}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base"
                  >
                    {bioLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                    {bioLoading ? "Verifying..." : "Sign In with Face ID"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-gray-500 text-sm">
                New here?{" "}
                <Link to="/register" className="text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 transition-colors">
                  Create an account <ArrowRight size={14} />
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-xs mt-6">
          Your account is securely stored on our cloud servers.
        </p>
      </div>
    </div>
  );
}
