import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/components/Onboarding";
import { localPhrases, useProgress, useAchievements } from "@/hooks/useApi";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Trophy, Flame, BrainCircuit, Play, BarChart3, LogOut, Settings, Sparkles, HelpCircle, Loader2 } from "lucide-react";
import type { Progress as ProgressStats } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  "Code Generation": "</>", "UI/UX Design": "🎨", "API & Backend": "🔌", "Data Analysis": "📊",
  "Content Creation": "✍️", "Business Strategy": "📈", "Database & SQL": "🗄️", "DevOps & Cloud": "☁️",
  "Mobile Development": "📱", "AI Model Tuning": "🤖", "Cybersecurity": "🔒", "Project Management": "📋",
};

// Bulletproof navigation that works even if React Router navigate fails
function safeNavigate(navigate: ReturnType<typeof useNavigate>, path: string) {
  try {
    navigate(path);
  } catch {
    window.location.hash = path;
  }
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { setShowOnboarding } = useOnboarding();
  const progressApi = useProgress(user?.id || 0);
  const achievementsApi = useAchievements(user?.id || 0);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data once on mount only — NOT in a useCallback/useEffect loop
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    try {
      setCategories(localPhrases.getCategories());
      setStats(progressApi.getStats() as any);
      setAchievements(achievementsApi.getAll().slice(0, 5));
    } catch (e) {
      console.error("Dashboard data load failed:", e);
      toast.error("Something went wrong loading your data. Please refresh.");
    } finally {
      if (mounted) setIsLoading(false);
    }
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("You've been signed out. See you soon!");
    safeNavigate(navigate, "/login");
  };

  const handleStartLearning = () => {
    safeNavigate(navigate, "/flashcards");
  };

  const handleViewProgress = () => {
    safeNavigate(navigate, "/progress");
  };

  const handleCategoryClick = (cat: string) => {
    safeNavigate(navigate, `/flashcards?category=${encodeURIComponent(cat)}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="animate-spin mx-auto mb-2" size={32} />
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white flex items-center justify-center">
        <div className="text-center">
          <BrainCircuit className="animate-pulse mx-auto mb-3 text-orange-500" size={48} />
          <p className="text-gray-600">Loading your AI Master dashboard...</p>
        </div>
      </div>
    );
  }

  const mastered = stats?.mastered || 0;
  const total = stats?.total_phrases || 300;
  const progressPercent = Math.round((mastered / total) * 100);
  const masteryLevel = progressPercent >= 100 ? "AI MASTER" : progressPercent >= 66 ? "Advanced" : progressPercent >= 33 ? "Intermediate" : "Novice";
  const displayName = user.email.split("@")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-base font-bold tracking-wide">Anglotec AI</h1>
              <p className="text-xs text-orange-400">AI Master Class</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/help" className="p-2 rounded-full hover:bg-white/10 text-white/80" title="Help & Support">
              <HelpCircle size={20} />
            </Link>
            <button onClick={() => setShowOnboarding(true)} className="p-2 rounded-full hover:bg-white/10 text-white/80" title="Show tutorial again">
              <Sparkles size={20} />
            </button>
            <Link to="/settings" className="p-2 rounded-full hover:bg-white/10 text-white/80" title="Settings">
              <Settings size={20} />
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-sm mr-2">
              <span className="text-sm text-orange-400">{displayName}</span>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-white/10 text-white/80" title="Sign out">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="shrink-0" size={28} />
            <div>
              <h2 className="text-lg font-bold">Welcome back, {displayName}!</h2>
              <p className="text-sm text-white/90">You're at {masteryLevel} level. Keep learning!</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-orange-500 shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-500">Level</p>
                  <p className="text-lg font-bold text-[#1a365d]">{masteryLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <BookOpen className="text-blue-500 shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-500">Mastered</p>
                  <p className="text-lg font-bold text-[#1a365d]">{mastered}/{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Flame className="text-red-500 shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-500">Streak</p>
                  <p className="text-lg font-bold text-[#1a365d]">{stats?.active_days || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-green-500 shrink-0" size={24} />
                <div>
                  <p className="text-xs text-gray-500">Badges</p>
                  <p className="text-lg font-bold text-[#1a365d]">{achievements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Your Progress to AI Master</span>
              <span className="text-sm font-bold text-orange-500">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Novice</span>
              <span>Intermediate</span>
              <span>Advanced</span>
              <span>AI Master</span>
            </div>
          </CardContent>
        </Card>

        {/* Main CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button onClick={handleStartLearning} className="group bg-gradient-to-r from-[#1a365d] to-[#0f172a] text-white rounded-xl p-5 text-left hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Play size={28} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Start Learning</h3>
                <p className="text-sm text-gray-300">Practice flashcards with audio</p>
              </div>
            </div>
          </button>
          <button onClick={handleViewProgress} className="group bg-white border-2 border-orange-200 rounded-xl p-5 text-left hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <BarChart3 size={28} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a365d]">View Progress</h3>
                <p className="text-sm text-gray-500">See your analytics & badges</p>
              </div>
            </div>
          </button>
        </div>

        {/* Categories */}
        <h2 className="text-lg font-bold text-[#1a365d] mb-3">Pick a Topic to Learn</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md hover:border-orange-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_ICONS[cat] || "📚"}</span>
                <div>
                  <span className="text-sm font-semibold text-[#1a365d] block">{cat}</span>
                  <span className="text-xs text-gray-500">25 phrases</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-[#1a365d] mb-3">Recent Achievements</h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map((ach) => (
                <Badge key={ach.id} variant="secondary" className="bg-orange-100 text-orange-700 px-3 py-1.5 text-sm">
                  <Trophy size={14} className="mr-1 text-orange-500" />{ach.badge_name}
                </Badge>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
