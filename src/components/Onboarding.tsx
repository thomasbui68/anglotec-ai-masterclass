import React, { createContext, useContext, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Volume2, Award, Brain, ArrowRight, Sparkles, X } from "lucide-react";

interface OnboardingContextType {
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;
  currentStep: number;
  setCurrentStep: (v: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  showOnboarding: false,
  setShowOnboarding: () => {},
  currentStep: 0,
  setCurrentStep: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem("anglotec_onboarding_seen");
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

  const finish = () => {
    localStorage.setItem("anglotec_onboarding_seen", "true");
    setShowOnboarding(false);
  };

  const steps = [
    {
      title: "Welcome to AI Master Class",
      icon: <Sparkles className="w-12 h-12 text-orange-500" />,
      description: "Learn 300 AI prompting phrases used by professionals worldwide. Part of the Anglotec AI Apps family.",
    },
    {
      title: "Flashcard Learning",
      icon: <BookOpen className="w-12 h-12 text-blue-500" />,
      description: "Swipe through cards, listen to pronunciation, and mark phrases as Mastered or Learning. Simple as that!",
    },
    {
      title: "Listen & Learn",
      icon: <Volume2 className="w-12 h-12 text-green-500" />,
      description: "Tap the Listen button to hear each phrase spoken aloud. Practice your pronunciation along with it.",
    },
    {
      title: "Track Your Progress",
      icon: <Award className="w-12 h-12 text-purple-500" />,
      description: "Watch your mastery level grow from Novice to AI Master. Earn badges and keep your streak alive!",
    },
    {
      title: "Powered by Anglotec AI",
      icon: <Brain className="w-12 h-12 text-orange-500" />,
      description: "Built exclusively with Anglotec AI technology. All your learning data stays private on your device.",
    },
  ];

  return (
    <OnboardingContext.Provider value={{ showOnboarding, setShowOnboarding, currentStep, setCurrentStep }}>
      {children}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="sm:max-w-md text-center">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
              Step {currentStep + 1} of {steps.length}
            </p>
            <button onClick={finish} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Skip tutorial">
              <X size={16} />
            </button>
          </div>
          <DialogHeader>
            <div className="flex justify-center mb-4">{steps[currentStep]?.icon}</div>
            <DialogTitle className="text-xl text-center">{steps[currentStep]?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-base leading-relaxed px-2">{steps[currentStep]?.description}</p>
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentStep ? "bg-orange-500" : i < currentStep ? "bg-orange-300" : "bg-gray-300"}`} />
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="flex-1">
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                Get Started!
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
