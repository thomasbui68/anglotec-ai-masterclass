import { createContext, useContext, useState, useCallback } from "react";
import { Sparkles, Volume2, Award, Brain, Star, ChevronRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Welcome, Explorer!",
    description: "You are about to learn 3000 AI prompting phrases used by professionals worldwide.",
    icon: Sparkles,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Listen and Learn",
    description: "Each card shows a professional AI prompt. Tap Listen to hear it pronounced.",
    icon: Volume2,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Mark Your Progress",
    description: "Tap I Know This when you remember the phrase. Tap Practice More if you want to see it again.",
    icon: Brain,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Earn Rewards",
    description: "Every correct answer earns you XP points! Build streaks for bonus points. Collect badges and climb the ranks!",
    icon: Crown,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  {
    title: "Track Your Journey",
    description: "Watch your progress bar fill up! Master all 12 categories. You can do this!",
    icon: Award,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
];

interface OnboardingContext {
  hasSeenOnboarding: boolean;
  startOnboarding: () => void;
  finishOnboarding: () => void;
}

const Context = createContext<OnboardingContext>({
  hasSeenOnboarding: true,
  startOnboarding: () => {},
  finishOnboarding: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    try {
      return localStorage.getItem("anglotec_onboarding_done") === "true";
    } catch {
      return false;
    }
  });

  const startOnboarding = useCallback(() => {
    setHasSeenOnboarding(false);
    try { localStorage.removeItem("anglotec_onboarding_done"); } catch { /* ignore */ }
  }, []);

  const finishOnboarding = useCallback(() => {
    setHasSeenOnboarding(true);
    try { localStorage.setItem("anglotec_onboarding_done", "true"); } catch { /* ignore */ }
  }, []);

  return (
    <Context.Provider value={{ hasSeenOnboarding, startOnboarding, finishOnboarding }}>
      {children}
    </Context.Provider>
  );
}

export function OnboardingModal({ onFinish }: { onFinish: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onFinish();
    }
  };

  const skip = () => onFinish();

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) skip(); }}
    >
      <div
        className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step dots */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-6 bg-orange-400" : i < currentStep ? "w-1.5 bg-green-400" : "w-1.5 bg-gray-700"
                }`}
              />
            ))}
          </div>
          <button
            onClick={skip}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-medium"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-center">
          <div className={`w-20 h-20 ${step.bgColor} rounded-3xl flex items-center justify-center mx-auto mb-5`}>
            <Icon size={36} className={step.color} />
          </div>

          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
        </div>

        {/* Action */}
        <div className="px-6 pb-6">
          <Button
            onClick={next}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold text-base rounded-2xl shadow-lg"
          >
            {currentStep === steps.length - 1 ? (
              <>Let&apos;s Go! <Star size={18} className="ml-2" /></>
            ) : (
              <>Next <ChevronRight size={18} className="ml-1" /></>
            )}
          </Button>

          {currentStep === steps.length - 1 && (
            <div className="flex justify-center gap-3 mt-4">
              {["Code", "Design", "AI", "Cloud", "Security", "Data"].map((tag) => (
                <span key={tag} className="text-[10px] bg-white/5 text-gray-500 px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  return useContext(Context);
}

export default OnboardingProvider;
