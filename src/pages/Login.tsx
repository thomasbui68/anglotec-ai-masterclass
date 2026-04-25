import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useFaceApi } from "@/hooks/useFaceApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogIn, ScanFace, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { request } = useApi();
  const faceApi = useFaceApi();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsFaceMode] = useState(false);
  const [isFaceLoading, setIsFaceLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }
    setIsLoading(true);
    try {
      const data = await request("/auth/login/password", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      login(data.token, data.user);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    if (!username) {
      toast.error("Please enter your username first");
      return;
    }
    setIsFaceLoading(true);
    try {
      await faceApi.loadModels();
      const started = await faceApi.startVideo();
      if (!started) {
        toast.error("Could not access camera");
        setIsFaceLoading(false);
        return;
      }
      // Wait for video to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const descriptor = await faceApi.detectFace();
      faceApi.stopVideo();
      if (!descriptor) {
        toast.error("No face detected. Please try again.");
        setIsFaceLoading(false);
        return;
      }
      const data = await request("/auth/login/face", {
        method: "POST",
        body: JSON.stringify({ username, faceDescriptor: descriptor }),
      });
      login(data.token, data.user);
      toast.success("Face recognized! Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Face login failed");
      faceApi.stopVideo();
    } finally {
      setIsFaceLoading(false);
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
            ANGLOTEC
          </CardTitle>
          <CardDescription className="text-[#d4af37] font-medium">
            AI MASTER CLASS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#f8f9fa]">
              <TabsTrigger value="password" onClick={() => setIsFaceMode(false)}>Password</TabsTrigger>
              <TabsTrigger value="face" onClick={() => setIsFaceMode(true)}>Face ID</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
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
                <Button
                  type="submit"
                  className="w-full bg-[#1a365d] hover:bg-[#0f172a] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="face">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="face-username">Username</Label>
                  <Input
                    id="face-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username for face login"
                    required
                  />
                </div>
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
                  {faceApi.error && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm px-4 text-center">
                      {faceApi.error}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleFaceLogin}
                  className="w-full bg-[#d4af37] hover:bg-[#b8941f] text-[#1a365d] font-semibold"
                  disabled={isFaceLoading || !faceApi.isLoaded}
                >
                  {isFaceLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanFace className="mr-2 h-4 w-4" />
                  )}
                  {isFaceLoading ? "Scanning..." : "Login with Face ID"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#1a365d] hover:text-[#d4af37] font-medium transition-colors">
              Register now
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
