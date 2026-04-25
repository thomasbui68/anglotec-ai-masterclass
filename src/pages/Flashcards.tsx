import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useApi";
import { trpc } from "@/providers/trpc";
import { useTTS } from "@/hooks/useTTS";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Volume2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Home, RotateCcw, Brain, Sparkles, Mic } from "lucide-react";

export default function Flashcards() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [showHint, setShowHint] = useState(true);
  const progressApi = useProgress(user?.id || 0);
  const tts = useTTS();

  // tRPC queries
  const { data: phraseData, isLoading: phrasesLoading } = trpc.phrase.list.useQuery({
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    page: 1,
    limit: 50,
  });

  const { data: categoryData } = trpc.phrase.categories.useQuery();

  const phrases = phraseData?.phrases ?? [];
  const categories = categoryData ?? [];

  const currentPhrase = phrases[currentIndex];

  useEffect(() => {
    setIsLoading(phrasesLoading);
  }, [phrasesLoading]);

  useEffect(() => {
    setCurrentIndex(0);
    setSessionStats({ correct: 0, incorrect: 0 });
  }, [selectedCategory]);

  const playAudio = () => {
    if (!currentPhrase) return;
    if (!tts.isReady) {
      toast.error("Audio engine is still loading. Please try again in a moment.");
      return;
    }
    tts.speak(currentPhrase.english);
  };

  const markPhrase = (status: "mastered" | "learning") => {
    if (!currentPhrase || !user) return;
    try {
      progressApi.update(currentPhrase.id, status);
      if (status === "mastered") {
        setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        toast.success("Great job! This phrase is now mastered.", { icon: "🎉" });
      } else {
        setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
        toast.info("Saved for later practice. You'll see it again soon!");
      }
      if (currentIndex < phrases.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        toast.success("Session complete! You practiced " + phrases.length + " phrases today!", { duration: 5000 });
      }
    } catch (e) {
      toast.error("Couldn't save your progress. Please try again.");
    }
  };

  const prevPhrase = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="animate-pulse mx-auto mb-3 text-orange-500" size={48} />
          <p className="text-gray-600">Loading your learning cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white flex flex-col">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 py-1 transition-colors">
            <Home size={18} /><span className="text-sm hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">{sessionStats.correct} learned</Badge>
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">{sessionStats.incorrect} practicing</Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">
        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setSelectedCategory("all")} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>All Topics</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{cat}</button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Card {currentIndex + 1} of {phrases.length}</span>
            <span>{Math.round(((currentIndex) / phrases.length) * 100)}% done</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex) / phrases.length) * 100}%` }} />
          </div>
        </div>

        {/* Hint */}
        {showHint && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2">
            <Sparkles className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-blue-700"><strong>Tip:</strong> Tap "Listen" to hear the phrase, then tap "I Know This" when you feel confident, or "Practice More" to review later.</p>
            <button onClick={() => setShowHint(false)} className="text-blue-400 hover:text-blue-600 ml-auto shrink-0">✕</button>
          </div>
        )}

        {currentPhrase ? (
          <>
            {/* Flashcard */}
            <Card className="mb-5 border-0 shadow-xl bg-white">
              <CardContent className="p-6 sm:p-8 text-center">
                <Badge className="mb-4 bg-[#1a365d] text-white text-sm px-3 py-1">{currentPhrase.category}</Badge>
                <div className="min-h-[140px] flex items-center justify-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1a365d] leading-relaxed">{currentPhrase.english}</h2>
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <Button onClick={playAudio} disabled={tts.isSpeaking || !tts.isReady} className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base" size="lg">
                    {tts.isSpeaking ? <RotateCcw className="mr-2 h-5 w-5 animate-spin" /> : <Volume2 className="mr-2 h-5 w-5" />}
                    {tts.isSpeaking ? "Playing..." : "Listen"}
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <p className="text-xs text-gray-400">Tap Listen to hear pronunciation</p>
                  {tts.engine === "responsiveVoice" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                      <Mic size={10} className="mr-0.5" /> Enhanced
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={prevPhrase} disabled={currentIndex === 0} className="h-14 text-base" size="lg">
                <ChevronLeft size={20} className="mr-1" /> Previous
              </Button>
              <Button onClick={() => markPhrase("learning")} variant="outline" className="h-14 text-base border-orange-300 text-orange-700 hover:bg-orange-50" size="lg">
                <XCircle size={20} className="mr-1" /> Practice More
              </Button>
              <Button onClick={() => markPhrase("mastered")} className="h-14 text-base bg-green-600 hover:bg-green-700 text-white" size="lg">
                <CheckCircle size={20} className="mr-1" /> I Know This
              </Button>
              <Button variant="outline" onClick={() => markPhrase("learning")} disabled={currentIndex >= phrases.length - 1} className="h-14 text-base" size="lg">
                Next <ChevronRight size={20} className="ml-1" />
              </Button>
            </div>

            {/* Keyboard shortcuts hint */}
            <p className="text-center text-xs text-gray-400 mt-4">Press Space to listen, ← → to navigate, M for mastered, L for learning</p>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No phrases found in this category.</p>
            <Button onClick={() => setSelectedCategory("all")} className="mt-4 bg-orange-500 hover:bg-orange-600">Show All Topics</Button>
          </div>
        )}
      </main>
    </div>
  );
}
