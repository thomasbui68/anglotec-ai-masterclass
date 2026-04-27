import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProgress, useAchievements } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Brain, BookOpen, ArrowLeft, Award, TrendingUp, Calendar } from "lucide-react";
import type { Progress as ProgressStats, Achievement } from "@/types";

export default function ProgressPage() {
  const { user } = useAuth();
  const progressApi = useProgress(user?.id || 0);
  const achievementsApi = useAchievements(user?.id || 0);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setStats(progressApi.stats as any);
    setAchievements(achievementsApi.achievements as any);
    setIsLoading(false);
  }, [user, progressApi.stats, achievementsApi.achievements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white flex items-center justify-center">
        <div className="text-[#1a365d] animate-pulse">Loading your progress...</div>
      </div>
    );
  }

  const total = stats?.total_phrases || 3000;
  const mastered = stats?.mastered || 0;
  const learning = stats?.learning || 0;
  const newCount = stats?.new_count || total - mastered - learning;
  const masteryPercent = Math.round((mastered / total) * 100);

  const masteryStages = [
    { label: "Novice", min: 0, max: 33, color: "bg-gray-400" },
    { label: "Intermediate", min: 33, max: 66, color: "bg-blue-400" },
    { label: "Advanced", min: 66, max: 99, color: "bg-purple-500" },
    { label: "AI Master", min: 99, max: 100, color: "bg-[#d4af37]" },
  ];

  const currentStage = masteryStages.find((s) => masteryPercent >= s.min && masteryPercent < s.max) || masteryStages[3];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/anglotec_logo.png" alt="Anglotec" className="h-8 w-8 object-contain" />
            <span className="font-bold tracking-wider text-sm">PROGRESS & ANALYTICS</span>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10"><ArrowLeft size={18} className="mr-1" />Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card className={`mb-8 ${currentStage.color} text-white border-0`}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wider">Current Level</p>
              <h2 className="text-3xl font-bold">{currentStage.label}</h2>
              <p className="text-white/90 mt-1">{masteryPercent}% complete towards AI Mastery</p>
            </div>
            <Brain size={64} className="text-white/30" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BookOpen className="text-[#1a365d]" size={24} /><div><p className="text-2xl font-bold text-[#1a365d]">{mastered}</p><p className="text-xs text-gray-500">Mastered</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="text-blue-500" size={24} /><div><p className="text-2xl font-bold text-[#1a365d]">{learning}</p><p className="text-xs text-gray-500">Learning</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="text-orange-500" size={24} /><div><p className="text-2xl font-bold text-[#1a365d]">{stats?.active_days || 0}</p><p className="text-xs text-gray-500">Active Days</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Flame className="text-red-500" size={24} /><div><p className="text-2xl font-bold text-[#1a365d]">{stats?.total_practices || 0}</p><p className="text-xs text-gray-500">Total Practices</p></div></div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-lg">Learning Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><div className="flex justify-between text-sm mb-1"><span>Mastered</span><span className="font-semibold">{mastered} ({Math.round((mastered / total) * 100)}%)</span></div><Progress value={(mastered / total) * 100} className="h-2 bg-gray-100" /></div>
              <div><div className="flex justify-between text-sm mb-1"><span>Learning</span><span className="font-semibold">{learning} ({Math.round((learning / total) * 100)}%)</span></div><Progress value={(learning / total) * 100} className="h-2 bg-gray-100" /></div>
              <div><div className="flex justify-between text-sm mb-1"><span>New</span><span className="font-semibold">{newCount} ({Math.round((newCount / total) * 100)}%)</span></div><Progress value={(newCount / total) * 100} className="h-2 bg-gray-100" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Mastery Roadmap</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {masteryStages.map((stage) => (
                <div key={stage.label} className={`flex items-center gap-3 p-2 rounded-lg ${currentStage.label === stage.label ? "bg-[#d4af37]/10 border border-[#d4af37]" : "bg-gray-50"}`}>
                  <div className={`w-4 h-4 rounded-full ${stage.color}`} />
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${currentStage.label === stage.label ? "text-[#d4af37]" : "text-gray-700"}`}>{stage.label}</p>
                    <p className="text-xs text-gray-500">{stage.min}% - {stage.max}%</p>
                  </div>
                  {currentStage.label === stage.label && <Badge className="bg-[#d4af37] text-white">Current</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Trophy className="text-[#d4af37]" size={20} />Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500"><Award size={48} className="mx-auto mb-2 text-gray-300" /><p>No achievements yet. Start learning to earn badges!</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {achievements.map((ach) => (
                  <div key={ach.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#d4af37]/10 to-transparent rounded-lg border border-[#d4af37]/20">
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center"><Award size={20} className="text-[#d4af37]" /></div>
                    <div>
                      <p className="font-semibold text-sm text-[#1a365d]">{ach.badgeName}</p>
                      <p className="text-xs text-gray-500">{new Date(ach.earnedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
