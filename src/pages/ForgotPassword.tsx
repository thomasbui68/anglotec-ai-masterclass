import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const { resetPassword, isSupabaseReady } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseReady) {
      setError("Supabase is not configured. Please set up your project credentials.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/app-icon.png" alt="Anglotec" className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-lg rounded-2xl" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm">We'll send you a reset link</p>
        </div>

        {/* Supabase Not Ready */}
        {!isSupabaseReady && (
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 mb-6 text-center">
            <AlertCircle size={20} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-yellow-300 text-sm font-medium">Cloud Auth Not Connected</p>
            <p className="text-yellow-400/70 text-xs mt-1">
              To enable password reset, please create a free Supabase project and add your credentials.
            </p>
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 text-xs underline mt-2 inline-block">
              Get Started with Supabase →
            </a>
          </div>
        )}

        <Card className="border-0 shadow-2xl">
          <CardContent className="p-6">
            {sent ? (
              /* Success State */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Check Your Email</h3>
                  <p className="text-gray-500 text-sm mt-2">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <p className="text-sm text-blue-800 font-medium mb-2">What to do next:</p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal pl-4">
                    <li>Check your inbox for the reset email</li>
                    <li>Click the reset link in the email</li>
                    <li>Enter your new password on the reset page</li>
                  </ol>
                </div>
                <Button onClick={() => setSent(false)} variant="outline" className="w-full">
                  Send to a different email
                </Button>
                <Link to="/login" className="block text-sm text-orange-600 hover:text-orange-700 font-medium">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail size={20} className="text-orange-500" /> Forgot Password
                  </CardTitle>
                </CardHeader>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className="h-12"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter the email associated with your account and we'll send you a reset link.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Send Reset Link"}
                </Button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <ArrowLeft size={14} /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
