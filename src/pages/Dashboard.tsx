import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Flame, BrainCircuit, Play, BarChart3,
  Settings, Sparkles, HelpCircle, Loader2, Zap,
  Target, Crown, Star, TrendingUp, ChevronRight,
  GraduationCap, Shield
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  "Code Generation": Zap,
  "UI/UX Design": Sparkles,
  "API & Backend": BarChart3,
  "Data Analysis": TrendingUp,
  "Content Creation": BookOpen,
  "Business Strategy": Crown,
  "Database & SQL": Target,
  "DevOps & Cloud": Flame,
  "Mobile Development": Star,
  "AI Model Tuning": BrainCircuit,
  "Cybersecurity": Shield,
  "Project Management": GraduationCap,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const game = useGamification();

  const { data: categoryData, isLoading: catLoading } = trpc.phrase.categories.useQuery();
  const { data: progressStats } = trpc.progress.getStats.useQuery(undefined, { enabled: !!user });

  const categories = categoryData ?? [];
  const stats = progressStats ?? {
    total_phrases: 3000, mastered: 0, learning: 0, new_count: 3000,
    avg_mastery: 0, total_practices: 0, active_days: 0, last_active: null,
  };

  const masteredPercent = stats.total_phrases > 0
    ? Math.round((stats.mastered / stats.total_phrases) * 100)
    : 0;

  const dailyPercent = Math.min(100, Math.round((game.dailyProgress / (game.dailyGoal || 10)) * 100));

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="" className="h-10 w-10 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Anglotec AI</h1>
              <p className="text-[10px] text-gray-400">AI Master Class</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/help" className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
              <HelpCircle size={20} />
            </Link>
            <Link to="/settings" className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {user ? `Welcome back!` : "Welcome!"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {game.streak > 0
                ? `${game.streak}-day streak! Keep it going!`
                : "Let's start learning!"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <Crown size={14} style={{ color: game.rankInfo.color }} />
              <span className="text-xs font-bold" style={{ color: game.rankInfo.color }}>{game.rankInfo.name}</span>
            </div>
            <p className="text-[10px] text-gray-400">Level {game.level}</p>
          </div>
        </div>

        {/* XP Bar */}
        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                <span className="text-sm font-semibold text-white">Level {game.level}</span>
              </div>
              <span className="text-xs text-gray-400">{game.xp} / {game.xpForNextLevel || 100} XP</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-1000" style={{ width: animated ? `${game.xpPercent}%` : "0%" }} />
            </div>
            {game.nextRank && (
              <p className="text-[10px] text-gray-500 mt-1 text-right">Next: {game.nextRank.name} at Level {game.nextRank.level}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Learned", value: stats.mastered, icon: BookOpen, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Practicing", value: stats.learning, icon: Flame, color: "text-orange-400", bg: "bg-orange-400/10" },
            { label: "Streak", value: game.streak, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "XP", value: `${game.xp}/${game.xpForNextLevel || 100}`, icon: Star, color: "text-yellow-400", bg: "bg-yellow-400/10" },
          ].map((s, i) => (
            <Card key={s.label} className="bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 text-center" style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)", transition: `all 0.5s ease ${i * 100}ms` }}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Goal */}
        <Card className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-400/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-orange-400" />
                <span className="text-sm font-semibold text-white">Daily Goal</span>
              </div>
              <span className="text-xs text-orange-300">{game.dailyProgress} / {game.dailyGoal || 10}</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-1000" style={{ width: animated ? `${dailyPercent}%` : "0%" }} />
            </div>
            {dailyPercent >= 100 ? (
              <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><Star size={12} /> Daily goal complete!</p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Practice {Math.max(0, (game.dailyGoal || 10) - game.dailyProgress)} more to reach your daily goal</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Start */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-6 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Play size={32} className="text-white ml-1" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Ready to Learn?</h3>
            <p className="text-white/80 text-sm mb-4">
              {stats.mastered > 0
                ? `You have mastered ${stats.mastered} phrases. Keep going!`
                : "Start with your first phrase today!"}
            </p>
            <Button onClick={() => navigate("/flashcards")} className="h-14 px-8 bg-white text-orange-600 hover:bg-orange-50 font-bold text-lg rounded-xl shadow-lg">
              Start Learning <ChevronRight size={20} className="ml-1" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <BrainCircuit size={18} className="text-orange-400" /> Choose a Topic
          </h3>
          {catLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={32} className="text-orange-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat, i) => {
                const Icon = CATEGORY_ICONS[cat] || Sparkles;
                const colors = [
                  "from-blue-500/30 to-blue-600/10 border-blue-400/30",
                  "from-green-500/30 to-green-600/10 border-green-400/30",
                  "from-purple-500/30 to-purple-600/10 border-purple-400/30",
                  "from-pink-500/30 to-pink-600/10 border-pink-400/30",
                  "from-orange-500/30 to-orange-600/10 border-orange-400/30",
                  "from-cyan-500/30 to-cyan-600/10 border-cyan-400/30",
                ];
                const c = colors[i % colors.length];
                return (
                  <button
                    key={cat}
                    onClick={() => navigate(`/flashcards?category=${encodeURIComponent(cat)}`)}
                    className={`bg-gradient-to-br ${c} backdrop-blur border rounded-2xl p-4 text-left hover:scale-105 transition-all duration-300 hover:shadow-lg group`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                      <Icon size={20} className="text-white" />
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">{cat}</p>
                    <p className="text-[10px] text-gray-400 mt-1">250 phrases</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Overall Progress */}
        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Overall Progress</span>
              <span className="text-sm font-bold text-white">{masteredPercent}%</span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full transition-all duration-1500" style={{ width: animated ? `${masteredPercent}%` : "0%" }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0</span>
              <span>{stats.mastered} learned</span>
              <span>{stats.total_phrases} total</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-xs pb-4 pt-2">
          <p>Anglotec Academy — Part of the Anglotec AI Apps Family</p>
        </footer>
      </main>
    </div>
  );
}
