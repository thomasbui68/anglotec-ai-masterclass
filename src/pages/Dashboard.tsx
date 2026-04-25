import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen,
  Trophy,
  Flame,
  BrainCircuit,
  Play,
  BarChart3,
  LogOut,
  User,
} from "lucide-react";
import type { Progress as ProgressStats } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  "Code Generation": "bg-blue-500",
  "UI/UX Design": "bg-purple-500",
  "API & Backend": "bg-green-500",
  "Data Analysis": "bg-orange-500",
  "Content Creation": "bg-pink-500",
  "Business Strategy": "bg-yellow-500",
  "Database & SQL": "bg-cyan-500",
  "DevOps & Cloud": "bg-indigo-500",
  "Mobile Development": "bg-teal-500",
  "AI Model Tuning": "bg-red-500",
  "Cybersecurity": "bg-gray-500",
  "Project Management": "bg-lime-500",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { request } = useApi();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, cats, achs] = await Promise.all([
          request("/progress/stats"),
          request("/phrases/categories"),
          request("/achievements"),
        ]);
        setStats(statsData);
        setCategories(cats);
        setAchievements(achs.slice(0, 5));
      } catch (err: any) {
        toast.error(err.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [request]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-white animate-pulse">Loading your AI Master dashboard...</div>
      </div>
    );
  }

  const mastered = stats?.mastered || 0;
  const total = stats?.total_phrases || 3000;
  const progressPercent = Math.round((mastered / total) * 100);
  const masteryLevel =
    progressPercent >= 100 ? "AI MASTER" : progressPercent >= 66 ? "Advanced" : progressPercent >= 33 ? "Intermediate" : "Novice";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/anglotec_logo.png" alt="Anglotec" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold tracking-wider">ANGLOTEC</h1>
              <p className="text-xs text-[#d4af37]">AI MASTER CLASS</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User size={16} />
              <span>{user?.username}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-white/10"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-[#d4af37]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mastery Level</p>
                  <p className="text-2xl font-bold text-[#1a365d]">{masteryLevel}</p>
                </div>
                <BrainCircuit className="text-[#d4af37]" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#1a365d]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mastered</p>
                  <p className="text-2xl font-bold text-[#1a365d]">
                    {mastered} <span className="text-sm text-gray-400">/ {total}</span>
                  </p>
                </div>
                <BookOpen className="text-[#1a365d]" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Days</p>
                  <p className="text-2xl font-bold text-[#1a365d]">{stats?.active_days || 0}</p>
                </div>
                <Flame className="text-orange-500" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Achievements</p>
                  <p className="text-2xl font-bold text-[#1a365d]">{achievements.length}</p>
                </div>
                <Trophy className="text-green-500" size={32} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={progressPercent} className="flex-1 h-3" />
              <span className="text-sm font-semibold text-[#1a365d]">{progressPercent}%</span>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>Novice</span>
              <span>Intermediate</span>
              <span>Advanced</span>
              <span>AI Master</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/flashcards">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-r from-[#1a365d] to-[#0f172a] text-white">
              <CardContent className="p-6 flex items-center gap-4">
                <Play size={40} className="text-[#d4af37]" />
                <div>
                  <h3 className="text-xl font-bold">Start Learning</h3>
                  <p className="text-sm text-gray-300">Practice with flashcards & audio</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/progress">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-[#d4af37] border-2">
              <CardContent className="p-6 flex items-center gap-4">
                <BarChart3 size={40} className="text-[#d4af37]" />
                <div>
                  <h3 className="text-xl font-bold text-[#1a365d]">View Progress</h3>
                  <p className="text-sm text-gray-500">Detailed analytics & achievements</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Categories */}
        <h2 className="text-xl font-bold text-[#1a365d] mb-4">Learning Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {categories.map((cat) => (
            <Link to={`/flashcards?category=${encodeURIComponent(cat)}`} key={cat}>
              <Card className="hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[cat] || "bg-gray-400"}`} />
                    <span className="text-sm font-medium text-[#1a365d]">{cat}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-[#1a365d] mb-4">Recent Achievements</h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map((ach) => (
                <Badge
                  key={ach.id}
                  variant="secondary"
                  className="bg-[#d4af37]/20 text-[#1a365d] px-3 py-1"
                >
                  <Trophy size={12} className="mr-1 text-[#d4af37]" />
                  {ach.badge_name}
                </Badge>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
