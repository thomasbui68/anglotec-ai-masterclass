import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { useTTS } from "@/hooks/useTTS";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Fingerprint, Trash2, Shield, Info, Loader2, CheckCircle, Mail, ShieldCheck, Mic, Volume2, Gauge, Play } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const webAuthn = useWebAuthn();
  const tts = useTTS();

  const bioRegisterMutation = trpc.auth.registerBiometric.useMutation();
  const bioRemoveMutation = trpc.auth.removeBiometric.useMutation();
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();

  const [isRegistering, setIsRegistering] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">Please sign in to view settings.</p>
          <Button onClick={() => navigate("/login")} className="bg-orange-500 hover:bg-orange-600">Go to Sign In</Button>
        </div>
      </div>
    );
  }

  const hasBiometric = user?.hasBiometric || false;

  const handleRegisterBiometric = async () => {
    setIsRegistering(true);
    try {
      const credentialId = await webAuthn.registerBiometric(user.email);
      if (credentialId) {
        await bioRegisterMutation.mutateAsync({ credentialId });
        toast.success("Face ID registered successfully! You can now log in with your face.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not register Face ID. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveBiometric = async () => {
    try {
      await bioRemoveMutation.mutateAsync();
      toast.success("Face ID removed. You can set it up again anytime.");
    } catch (err: any) {
      toast.error("Could not remove Face ID. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
      logout();
      toast.success("Your account and all data have been deleted.");
      navigate("/login");
    } catch (err: any) {
      toast.error("Could not delete account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-base font-bold tracking-wide">Anglotec AI</h1>
              <p className="text-xs text-orange-400">Settings</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft size={18} className="mr-1" /> Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Account Info */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail size={20} className="text-orange-500" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="font-semibold text-[#1a365d]">{user.email}</span>
            </div>
            {user?.backupEmail && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500 text-sm">Backup Email</span>
                <span className="font-semibold text-[#1a365d]">{user.backupEmail}</span>
              </div>
            )}
            {user?.phoneNumber && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500 text-sm">Phone</span>
                <span className="font-semibold text-[#1a365d]">{user.phoneNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Email Status</span>
              <Badge className={user?.emailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                {user?.emailVerified ? <><CheckCircle size={12} className="mr-1" /> Verified</> : "Unverified"}
              </Badge>
            </div>
            {user?.phoneNumber && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500 text-sm">Phone Status</span>
                <Badge className={user?.phoneVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                  {user?.phoneVerified ? <><CheckCircle size={12} className="mr-1" /> Verified</> : "Unverified"}
                </Badge>
              </div>
            )}
            {user?.securityQuestion && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500 text-sm">Recovery Question</span>
                <Badge className="bg-green-100 text-green-700"><CheckCircle size={12} className="mr-1" /> Set</Badge>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Account Type</span>
              <span className="font-semibold text-[#1a365d]">Learner</span>
            </div>
          </CardContent>
        </Card>

        {/* Voice & Audio */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 size={20} className="text-orange-500" /> Voice & Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Engine status */}
            <div className={`p-3 rounded-lg flex items-start gap-2 ${tts.engine === "responsiveVoice" ? "bg-blue-50 border border-blue-200" : tts.engine === "webSpeech" ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
              {tts.engine === "responsiveVoice" ? <Mic size={18} className="text-blue-600 shrink-0 mt-0.5" /> : tts.engine === "webSpeech" ? <Volume2 size={18} className="text-green-600 shrink-0 mt-0.5" /> : <Info size={18} className="text-gray-500 shrink-0 mt-0.5" />}
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {tts.engine === "responsiveVoice" ? "Enhanced AI Voice Active" : tts.engine === "webSpeech" ? "Browser Voice Active" : "Voice engine loading..."}
                </p>
                <p className="text-xs text-gray-600">
                  {tts.engine === "responsiveVoice"
                    ? "Using ResponsiveVoice AI for lifelike speech."
                    : tts.engine === "webSpeech"
                    ? "Using your browser's built-in voices. Choose the best voice below."
                    : "Loading speech engines..."}
                </p>
              </div>
            </div>

            {/* Voice selector */}
            {tts.voices.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Speaking Voice</label>
                <select
                  value={tts.selectedVoice}
                  onChange={(e) => tts.selectVoice(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  {tts.voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} {voice.quality >= 8 ? "(High Quality)" : voice.quality >= 6 ? "(Good)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {tts.voices[0]?.quality >= 8
                    ? "Samantha or Google voices provide the best quality."
                    : "Select a voice that sounds clearest on your device."}
                </p>
              </div>
            )}

            {/* Rate slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Gauge size={14} /> Speech Speed
                </label>
                <span className="text-sm font-semibold text-orange-600">{Math.round(tts.rate * 100)}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={Math.round(tts.rate * 100)}
                onChange={(e) => tts.setSpeechRate(Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>

            {/* Test button */}
            <Button
              onClick={() => tts.speak("Welcome to Anglotec AI Master Class. Let's learn together.")}
              disabled={tts.isSpeaking || !tts.isReady}
              variant="outline"
              className="w-full h-12 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {tts.isSpeaking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
              {tts.isSpeaking ? "Playing..." : "Test Voice"}
            </Button>
          </CardContent>
        </Card>

        {/* Face ID / Biometric */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint size={20} className="text-orange-500" /> Face ID Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device capability info */}
            <div className={`p-3 rounded-lg flex items-start gap-2 ${webAuthn.inIframe ? "bg-yellow-50 border border-yellow-200" : webAuthn.isReady ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
              {webAuthn.inIframe ? <Info size={18} className="text-yellow-600 shrink-0 mt-0.5" /> : webAuthn.isReady ? <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" /> : <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />}
              <div>
                <p className="text-sm font-medium text-gray-800">{webAuthn.inIframe ? "Preview Mode — Face ID Blocked" : webAuthn.isReady ? "Face ID Ready" : "Try Face ID Setup"}</p>
                <p className="text-xs text-gray-600">{webAuthn.capabilityMessage}</p>
              </div>
            </div>

            {/* Iframe-specific help */}
            {webAuthn.inIframe && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-800">To set up Face ID:</p>
                <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                  <li>Open Safari on your iPhone</li>
                  <li>Go to <strong className="text-orange-700">https://ghp6irq5ajpju.kimi.show</strong></li>
                  <li>Sign in and go to Settings</li>
                  <li>Tap "Set Up Face ID" — it will work directly</li>
                </ol>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Log in instantly using your device's built-in Face ID or fingerprint. No passwords needed. Only one biometric credential per account.
            </p>

            {hasBiometric && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <CheckCircle size={18} /> Face ID / fingerprint is active on this account.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleRegisterBiometric}
                disabled={isRegistering}
                className="bg-orange-500 hover:bg-orange-600 text-white h-12"
              >
                {isRegistering ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                {isRegistering ? "Setting up..." : hasBiometric ? "Re-register Face ID" : "Set Up Face ID"}
              </Button>
              {hasBiometric && (
                <Button variant="outline" onClick={handleRemoveBiometric} className="h-12 border-red-300 text-red-600 hover:bg-red-50">
                  <Trash2 className="mr-2 h-5 w-5" /> Remove Face ID
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield size={20} className="text-orange-500" /> Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Your account and learning data are securely stored on our cloud servers. You can access your account from any device.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <Trash2 size={20} /> Delete Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This will permanently delete your account, all learning progress, and achievements. This cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="border-red-300 text-red-600 hover:bg-red-50 h-12">
                Delete My Account
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-red-700 font-medium">Are you sure? This cannot be undone.</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-12">Cancel</Button>
                  <Button onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white h-12">
                    <Trash2 className="mr-2 h-5 w-5" /> Yes, Delete Everything
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
