import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Pause,
  Volume2,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Brain,
} from "lucide-react";
import type { Phrase } from "@/types";

export default function Flashcards() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const { request } = useApi();

  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });

  const currentPhrase = phrases[currentIndex];

  const fetchPhrases = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = selectedCategory !== "all" ? `?category=${encodeURIComponent(selectedCategory)}&limit=50` : "?limit=50";
      const data = await request(`/phrases${query}`);
      setPhrases(data.phrases || []);
      setCurrentIndex(0);
      setSessionStats({ correct: 0, incorrect: 0 });
    } catch (err: any) {
      toast.error(err.message || "Failed to load phrases");
    } finally {
      setIsLoading(false);
    }
  }, [request, selectedCategory]);

  useEffect(() => {
    fetchPhrases();
    request("/phrases/categories").then(setCategories).catch(() => {});
  }, [fetchPhrases, request]);

  const playAudio = async () => {
    if (!currentPhrase) return;

    // Stop existing audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setIsPlaying(true);

    try {
      // Try server audio first
      const response = await fetch(`/api/audio/${currentPhrase.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.ok && response.headers.get("Content-Type")?.includes("audio")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else {
        // Fallback to Web Speech API
        useWebSpeech(currentPhrase.english);
      }
    } catch {
      // Fallback to Web Speech API
      useWebSpeech(currentPhrase.english);
    }
  };

  const useWebSpeech = (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech not available");
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => {
      setIsPlaying(false);
      toast.error("Speech playback failed");
    };
    window.speechSynthesis.speak(utterance);
  };

  const markPhrase = async (status: "mastered" | "learning") => {
    if (!currentPhrase) return;
    try {
      await request(`/progress/${currentPhrase.id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });

      if (status === "mastered") {
        setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
        toast.success("Marked as mastered!");
      } else {
        setSessionStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
        toast.info("Marked for review");
      }

      nextPhrase();
    } catch (err: any) {
      toast.error(err.message || "Failed to update progress");
    }
  };

  const nextPhrase = () => {
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(true);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    } else {
      toast.success("Session complete! Great job!");
    }
  };

  const prevPhrase = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowAnswer(true);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white flex items-center justify-center">
        <div className="text-[#1a365d] animate-pulse flex items-center gap-2">
          <Brain className="animate-bounce" />
          Loading phrases...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/anglotec_logo.png" alt="Anglotec" className="h-8 w-8 object-contain" />
            <span className="font-bold tracking-wider text-sm">FLASHCARDS</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary" className="bg-[#d4af37]/20 text-[#d4af37]">
              {sessionStats.correct} mastered
            </Badge>
            <Badge variant="secondary" className="bg-red-500/20 text-red-400">
              {sessionStats.incorrect} learning
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={16} className="text-[#1a365d] shrink-0" />
          <Button
            size="sm"
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className={selectedCategory === "all" ? "bg-[#1a365d]" : ""}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? "bg-[#1a365d]" : ""}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>
              Card {currentIndex + 1} of {phrases.length}
            </span>
            <span>{Math.round(((currentIndex + 1) / phrases.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#d4af37] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / phrases.length) * 100}%` }}
            />
          </div>
        </div>

        {currentPhrase ? (
          <>
            {/* Flashcard */}
            <Card className="mb-6 border-2 border-[#1a365d]/10 shadow-xl">
              <CardContent className="p-8 text-center">
                <Badge className="mb-4 bg-[#1a365d] text-white">{currentPhrase.category}</Badge>

                <div className="min-h-[120px] flex items-center justify-center">
                  {showAnswer ? (
                    <h2 className="text-2xl md:text-3xl font-bold text-[#1a365d] leading-relaxed">
                      {currentPhrase.english}
                    </h2>
                  ) : (
                    <div className="text-gray-400 text-lg">Tap to reveal phrase</div>
                  )}
                </div>

                {/* Audio controls */}
                <div className="flex justify-center gap-3 mt-6">
                  <Button
                    onClick={playAudio}
                    disabled={isPlaying}
                    className="bg-[#d4af37] hover:bg-[#b8941f] text-[#1a365d] font-semibold"
                  >
                    {isPlaying ? <Pause size={18} /> : <Volume2 size={18} />}
                    {isPlaying ? "Playing..." : "Listen"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAnswer(!showAnswer)}
                  >
                    <RotateCcw size={18} className="mr-1" />
                    {showAnswer ? "Hide" : "Show"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Navigation & Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={prevPhrase}
                disabled={currentIndex === 0}
                className="w-full"
              >
                <ChevronLeft size={18} />
                Previous
              </Button>

              <Button
                onClick={() => markPhrase("learning")}
                variant="outline"
                className="w-full border-orange-400 text-orange-600 hover:bg-orange-50"
              >
                <XCircle size={18} className="mr-1" />
                Learning
              </Button>

              <Button
                onClick={() => markPhrase("mastered")}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={18} className="mr-1" />
                Mastered
              </Button>

              <Button
                variant="outline"
                onClick={nextPhrase}
                disabled={currentIndex >= phrases.length - 1}
                className="w-full"
              >
                Next
                <ChevronRight size={18} />
              </Button>
            </div>
          </>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No phrases available. Try a different category.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
