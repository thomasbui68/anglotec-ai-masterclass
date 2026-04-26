import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useProgress } from "@/hooks/useApi";
import { useTTS } from "@/hooks/useTTS";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Volume2, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Home, RotateCcw, Brain, Mic, Star, Flame,
  Zap, Loader2
} from "lucide-react";

export default function Flashcards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";

  const { user } = useAuth();
  const game = useGamification();
  const tts = useTTS();
  const progressApi = useProgress(user?.id || 0);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, streak: 0, bestStreak: 0 });
  const [showHint, setShowHint] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [comboCount, setComboCount] = useState(0);

  // tRPC queries
  const { data: phraseData, isLoading: phrasesLoading } = trpc.phrase.list.useQuery({
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    page: 1, limit: 50,
  });
  const { data: categoryData } = trpc.phrase.categories.useQuery();

  const phrases = phraseData?.phrases ?? [];
  const categories = categoryData ?? [];
  const currentPhrase = phrases[currentIndex];

  // Session start
  useEffect(() => {
    game.recordSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phrases.length > 0 && showHint) {
      const timer = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [phrases.length, showHint]);

  const playAudio = useCallback(() => {
    if (!currentPhrase || !tts.isReady) return;
    tts.speak(currentPhrase.english);
  }, [currentPhrase, tts]);

  const handleFeedback = useCallback((isCorrect: boolean) => {
    setFlipped(true);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      game.recordCorrect();
      progressApi.update(currentPhrase.id, "mastered");
      const newStreak = sessionStats.streak + 1;
      const newCombo = comboCount + 1;
      setSessionStats((s) => ({
        ...s,
        correct: s.correct + 1,
        streak: newStreak,
        bestStreak: Math.max(newStreak, s.bestStreak),
      }));
      setComboCount(newCombo);

      if (newCombo >= 3) {
        toast.success(`${newCombo}x Combo! You're on fire!`, { icon: <Flame size={16} className="text-orange-500" /> });
        game.addXp(5); // bonus XP for combos
      }
      if (newStreak === 10) toast.success("10 in a row! Amazing!", { icon: <Star size={16} className="text-yellow-500" /> });
    } else {
      setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1, streak: 0 }));
      setComboCount(0);
      progressApi.update(currentPhrase.id, "learning");
    }

    setTimeout(() => {
      setFlipped(false);
      setFeedback(null);
      if (currentIndex < phrases.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setShowScore(true);
      }
    }, 1200);
  }, [currentPhrase, currentIndex, phrases.length, sessionStats, comboCount, game, progressApi]);

  const nextCard = useCallback(() => {
    setFlipped(false);
    setFeedback(null);
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, phrases.length]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      setFlipped(false);
      setFeedback(null);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setSessionStats({ correct: 0, incorrect: 0, streak: 0, bestStreak: 0 });
    setComboCount(0);
    setShowScore(false);
    setFlipped(false);
    setFeedback(null);
  }, []);

  // Score screen
  if (showScore) {
    const accuracy = sessionStats.correct + sessionStats.incorrect > 0
      ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
      : 0;
    const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 border-white/10 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <Star key={s} size={40} className={s <= stars ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {accuracy >= 90 ? "Outstanding!" : accuracy >= 60 ? "Great Job!" : "Keep Practicing!"}
            </h2>
            <p className="text-gray-400 text-sm mb-6">Session Complete</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-400">{sessionStats.correct}</p>
                <p className="text-xs text-gray-400">Correct</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-blue-400">{accuracy}%</p>
                <p className="text-xs text-gray-400">Accuracy</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-orange-400">{sessionStats.bestStreak}</p>
                <p className="text-xs text-gray-400">Best Streak</p>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-400/30 rounded-xl p-3 mb-6">
              <div className="flex items-center justify-center gap-2">
                <Zap size={16} className="text-orange-400" />
                <span className="text-sm text-orange-300">+{sessionStats.correct * 10 + (comboCount >= 3 ? comboCount * 5 : 0)} XP earned!</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={restart} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <RotateCcw className="mr-2" size={18} /> Practice Again
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="h-12 px-4 border-white/20 text-white hover:bg-white/10">
                <Home size={18} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phrasesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your phrases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a]">
      {/* Combo indicator */}
      {comboCount >= 2 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full px-4 py-2 shadow-xl flex items-center gap-2">
            <Flame size={16} className="text-white" />
            <span className="text-white font-bold text-sm">{comboCount}x Combo!</span>
          </div>
        </div>
      )}

      {/* Streak bar */}
      <div className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <Home size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-orange-400">
                <Flame size={14} />
                <span className="text-xs font-bold">{sessionStats.streak}</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star size={14} />
                <span className="text-xs font-bold">{sessionStats.correct * 10} XP</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">{currentIndex + 1}/{phrases.length}</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / phrases.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Category selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => { setSelectedCategory("all"); setCurrentIndex(0); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === "all" ? "bg-orange-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setCurrentIndex(0); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat ? "bg-orange-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Hint tooltip */}
        {showHint && (
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 mb-4 flex items-start gap-2 animate-in fade-in">
            <Brain size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Tap Listen to hear the phrase, then tap "I Know This" when you remember it, or "Practice More" if you need more time.
            </p>
          </div>
        )}

        {/* Flashcard */}
        {currentPhrase && (
          <div className="mb-6" style={{ perspective: "1000px" }}>
            <div
              className="relative transition-all duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front of card */}
              <div
                className={`bg-gradient-to-br from-[#1e293b] to-[#0f172a] border rounded-2xl p-8 min-h-[280px] flex flex-col items-center justify-center text-center transition-all duration-300 ${
                  feedback === "correct" ? "border-green-500 shadow-lg shadow-green-500/30" :
                  feedback === "wrong" ? "border-red-500 shadow-lg shadow-red-500/30" :
                  "border-white/10"
                }`}
              >
                <Badge className="mb-4 bg-white/10 text-gray-300 border-0 text-xs">
                  {currentPhrase.category}
                </Badge>

                <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed mb-6">
                  {currentPhrase.english}
                </p>

                {/* Listen button */}
                <Button
                  onClick={playAudio}
                  disabled={tts.isSpeaking || !tts.isReady}
                  className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base rounded-xl"
                  size="lg"
                >
                  {tts.isSpeaking ? <RotateCcw className="mr-2 h-5 w-5 animate-spin" /> : <Volume2 className="mr-2 h-5 w-5" />}
                  {tts.isSpeaking ? "Playing..." : "Listen"}
                </Button>

                {tts.engine === "responsiveVoice" && (
                  <Badge variant="secondary" className="mt-2 bg-blue-500/20 text-blue-300 text-[10px] border-0">
                    <Mic size={10} className="mr-1" /> Enhanced Voice
                  </Badge>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <p className="text-xs text-gray-500">Tap a button below after listening</p>
                </div>
              </div>
            </div>

            {/* Feedback overlay */}
            {feedback && (
              <div className={`mt-4 rounded-xl p-4 text-center animate-in zoom-in ${
                feedback === "correct" ? "bg-green-500/20 border border-green-400/30" : "bg-red-500/20 border border-red-400/30"
              }`}>
                {feedback === "correct" ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={20} className="text-green-400" />
                    <span className="text-green-300 font-semibold">Great job! +10 XP</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <XCircle size={20} className="text-red-400" />
                    <span className="text-red-300 font-semibold">No worries — keep practicing!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!flipped && currentPhrase && (
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => handleFeedback(false)}
              className="flex-1 h-14 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30 font-semibold rounded-xl text-sm"
            >
              <XCircle className="mr-2" size={18} /> Practice More
            </Button>
            <Button
              onClick={() => handleFeedback(true)}
              className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-sm"
            >
              <CheckCircle className="mr-2" size={18} /> I Know This!
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevCard}
            disabled={currentIndex === 0}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs text-gray-500 font-mono">{currentIndex + 1} / {phrases.length}</span>
          <button
            onClick={nextCard}
            disabled={currentIndex >= phrases.length - 1}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8">
          Anglotec AI Master Class — Part of the Anglotec AI Apps Family
        </p>
      </main>
    </div>
  );
}
