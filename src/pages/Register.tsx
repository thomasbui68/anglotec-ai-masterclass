import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useFaceApi } from "@/hooks/useFaceApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Loader2, ScanFace, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { request } = useApi();
  const faceApi = useFaceApi();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollFace, setEnrollFace] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const data = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      // If face enrollment requested
      if (enrollFace) {
        setIsEnrolling(true);
        await faceApi.loadModels();
        const started = await faceApi.startVideo();
        if (started) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const descriptor = await faceApi.detectFace();
          faceApi.stopVideo();
          if (descriptor) {
            await request("/user/face-enroll", {
              method: "POST",
              body: JSON.stringify({ faceDescriptor: descriptor }),
              headers: { Authorization: `Bearer ${data.token}` },
            });
            toast.success("Face ID enrolled successfully!");
          }
        }
        setIsEnrolling(false);
      }

      login(data.token, data.user);
      toast.success("Account created! Welcome to Anglotec AI Master Class.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <img src="/anglotec_logo.png" alt="Anglotec" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1a365d] tracking-wider">
            GET STARTED
          </CardTitle>
          <CardDescription className="text-[#d4af37] font-medium">
            Create your AI Master Class account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enrollFace"
                checked={enrollFace}
                onCheckedChange={(checked) => setEnrollFace(checked === true)}
              />
              <Label htmlFor="enrollFace" className="text-sm cursor-pointer flex items-center gap-1">
                <ScanFace size={14} className="text-[#d4af37]" />
                Enable Face ID login (optional)
              </Label>
            </div>

            {enrollFace && (
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={faceApi.videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                {!faceApi.isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    <Loader2 className="animate-spin mr-2" />
                    Loading face models...
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#1a365d] hover:bg-[#0f172a] text-white"
              disabled={isLoading || isEnrolling}
            >
              {isLoading || isEnrolling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {isEnrolling ? "Enrolling Face..." : isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-[#1a365d] hover:text-[#d4af37] font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
