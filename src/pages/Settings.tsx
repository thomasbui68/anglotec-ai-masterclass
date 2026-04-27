import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Fingerprint, Trash2, Shield, Info, Loader2,
  CheckCircle, Mail, ShieldCheck, Play,
  AlertTriangle, Crown, Clock, Zap, CreditCard, Sparkles
} from "lucide-react";

export default function Settings() {
  const { user, logout, mode } = useAuth();
  const navigate = useNavigate();
  const webAuthn = useWebAuthn();
  const tts = useElevenLabsTTS();

  const isLocalMode = mode === "local" || mode === "unknown";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isLocalMode = isLocalMode; // kept for compat, not used with Supabase
  const subscription = useSubscription();

  const trialDaysLeft = subscription.trialEndsAt
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const inTrial = subscription.status === "trial" && trialDaysLeft > 0;

  const [isRegistering, setIsRegistering] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasBiometricState, setHasBiometricState] = useState(user?.hasBiometric || false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-6">
        <div className="text-white text-center max-w-sm">
          <Info size={48} className="mx-auto mb-4 text-orange-400" />
          <h2 className="text-xl font-bold mb-2">Please Sign In</h2>
          <p className="text-gray-400 mb-6">You need to be signed in to view your settings.</p>
          <Button onClick={() => navigate("/login")} className="bg-orange-500 hover:bg-orange-600 h-12 px-6">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  const hasBiometric = hasBiometricState;

  const handleRegisterBiometric = async () => {
    if (!webAuthn.canUseBiometric) {
      toast.error(webAuthn.error || "Face ID is not available on this browser.");
      return;
    }

    setIsRegistering(true);
    try {
      const result = await webAuthn.registerBiometric(user.email);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.credentialId) {
        // Save credential to Supabase user metadata
        const { supabase } = await import("@/lib/supabase");
        await supabase.auth.updateUser({
          data: { credential_id: result.credentialId, has_biometric: true }
        });
        toast.success("Face ID registered successfully! You can now log in with your face.");
        setHasBiometricState(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not register Face ID. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveBiometric = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.auth.updateUser({
        data: { credential_id: null, has_biometric: false }
      });
      toast.success("Face ID removed. You can set it up again anytime.");
      setHasBiometricState(false);
    } catch {
      toast.error("Could not remove Face ID. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await logout();
      toast.success("Account deletion scheduled. We're sorry to see you go!");
      navigate("/login");
    } catch {
      toast.error("Could not delete account. Please contact support.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec" className="h-10 w-10 object-contain drop-shadow-lg rounded-xl" />
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

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Account Info */}
        <Card>
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

        {/* Subscription Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown size={20} className="text-orange-500" /> Your Plan
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
                    {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                    {subscription.isPaid && (
                      <Badge className="ml-2 bg-orange-100 text-orange-700 text-[10px]">
                        <Zap size={10} className="mr-0.5" /> Active
                      </Badge>
                    )}
                    {inTrial && (
                      <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">
                        <Clock size={10} className="mr-0.5" /> Trial
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {subscription.isPaid
                      ? "You have unlimited access"
                      : inTrial
                      ? `${trialDaysLeft} days left in your free trial`
                      : "20 phrases per day"}
                  </p>
                </div>
              </div>

              {inTrial && (
                <p className="text-xs text-green-700 mt-2 bg-white/50 p-2 rounded-lg">
                  Your trial gives you full Pro access. Choose a plan before it ends to keep uninterrupted access.
                </p>
              )}
            </div>

            {/* Plan features */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">What is included:</p>
              {subscription.tier === "free" ? (
                <>
                  {["20 phrases per day", "6 basic categories", "Local progress tracking"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500" /> {f}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {["Unlimited phrases", "All 12 categories", "AI voice pronunciation", "Cross-device sync", "Weekly new content"].map((f) => (
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
                {inTrial ? "Choose a Plan" : subscription.tier === "free" ? "Upgrade to Pro" : "Change Plan"}
              </Button>
              {subscription.tier !== "free" && !inTrial && (
                <Button
                  variant="outline"
                  onClick={() => {
                    subscription.upgrade("free");
                    toast.success("Plan cancelled. You will have access until the end of your billing period.");
                  }}
                  className="h-11 border-gray-300 text-gray-600"
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voice & Audio - ElevenLabs Premium */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" /> Voice & Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ElevenLabs status banner */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 ${
              tts.hasConfig
                ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                : "bg-gray-50 border-gray-200"
            }`}>
              <Sparkles size={18} className={`shrink-0 mt-0.5 ${tts.hasConfig ? "text-amber-600" : "text-gray-400"}`} />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {tts.hasConfig ? "ElevenLabs AI Voice Active" : "ElevenLabs Voice (Coming Soon)"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tts.hasConfig
                    ? `Using "${tts.voices.find(v => v.key === tts.currentVoice)?.name || "Rachel"}" — ultra-realistic AI voice.`
                    : "Add an ElevenLabs API key to enable premium AI voices that sound completely natural."}
                </p>
              </div>
            </div>

            {/* ElevenLabs voice selector */}
            {tts.voices.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">AI Voice Character</label>
                <select
                  value={tts.currentVoice}
                  onChange={(e) => tts.selectVoice(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {tts.voices.map((voice) => (
                    <option key={voice.key} value={voice.key}>
                      {voice.name} — {voice.description} ({voice.accent})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400">
                  Each voice is a unique AI character trained on real human speech.
                </p>
              </div>
            )}

            {/* Test Voice Button */}
            <Button
              onClick={() => tts.speak("Welcome to Anglotec AI Master Class. Let's learn some amazing phrases together.")}
              disabled={tts.isSpeaking || !tts.isReady}
              variant="outline"
              className="w-full h-12 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl"
            >
              {tts.isSpeaking ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {tts.isSpeaking ? "Playing..." : "Test Premium Voice"}
            </Button>

            {tts.error && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">{tts.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Face ID / Biometric */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint size={20} className="text-orange-500" /> Face ID Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status banner */}
            {webAuthn.inIframe ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Preview Mode</p>
                    <p className="text-xs text-yellow-700 mt-1">Face ID cannot work inside this preview panel. Please open the app directly in Safari on iPhone or Chrome on Android.</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 text-xs text-gray-600 space-y-1">
                  <p className="font-medium text-gray-800">To set up Face ID:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open Safari on your iPhone</li>
                    <li>Go to <strong className="text-orange-700">ghp6irq5ajpju.kimi.show</strong></li>
                    <li>Sign in and go to Settings</li>
                    <li>Tap Set Up Face ID</li>
                  </ol>
                </div>
              </div>
            ) : webAuthn.isReady ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{webAuthn.capabilityMessage}</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{webAuthn.capabilityMessage}</p>
              </div>
            )}

            {/* Active status */}
            {hasBiometric && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <CheckCircle size={18} /> Face ID is active on this account.
              </div>
            )}

            {/* Error display */}
            {webAuthn.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{webAuthn.error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleRegisterBiometric}
                disabled={isRegistering || !webAuthn.canUseBiometric}
                className="bg-orange-500 hover:bg-orange-600 text-white h-12 disabled:opacity-50"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield size={20} className="text-orange-500" /> Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Your account and learning data are securely stored on our cloud servers. Access from any device.
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
