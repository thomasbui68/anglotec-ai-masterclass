import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Sparkles, Volume2, Award, Brain, Star, ChevronRight, Crown, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const ONBOARDING_KEY = "__anglotec_onboarding_v2__";

interface OnboardingStep {
  id: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const getSteps = (t: (k: string) => string): OnboardingStep[] => [
  {
    id: "welcome",
    titleKey: t("onboarding.welcomeTitle"),
    descKey: t("onboarding.welcomeDesc"),
    icon: Sparkles,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "listen",
    titleKey: t("onboarding.listenTitle"),
    descKey: t("onboarding.listenDesc"),
    icon: Volume2,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "progress",
    titleKey: t("onboarding.progressTitle"),
    descKey: t("onboarding.progressDesc"),
    icon: Brain,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    id: "rewards",
    titleKey: t("onboarding.rewardsTitle"),
    descKey: t("onboarding.rewardsDesc"),
    icon: Crown,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: "journey",
    titleKey: t("onboarding.journeyTitle"),
    descKey: t("onboarding.journeyDesc"),
    icon: Award,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
];

interface OnboardingContext {
  show: boolean;
  open: () => void;
  close: () => void;
  hasCompleted: boolean;
}

const Context = createContext<OnboardingContext>({ show: false, open: () => {}, close: () => {}, hasCompleted: true });

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY) === "done";
    setHasCompleted(completed);
    // Auto-show after a short delay if first-time
    if (!completed) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const open = useCallback(() => setShow(true), []);
  const close = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "done");
    setHasCompleted(true);
    setShow(false);
  }, []);

  return (
    <Context.Provider value={{ show, open, close, hasCompleted }}>
      {children}
      {show && <OnboardingModal onFinish={close} />}
    </Context.Provider>
  );
}

function OnboardingModal({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  const steps = getSteps(t);
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;
  const modalRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  // Focus trap + keyboard navigation
  useEffect(() => {
    modalRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onFinish();
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentStep]);

  // Announce step change to screen readers
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = `${step.titleKey}. ${step.descKey}`;
    }
  }, [currentStep, step]);

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onFinish();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.title")}
      onClick={(e) => { if (e.target === e.currentTarget) onFinish(); }}
    >
      {/* Live region for screen reader announcements */}
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl outline-none"
      >
        {/* Close button */}
        <button
          onClick={onFinish}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>

        {/* Step dots — accessible progress */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={t("onboarding.stepProgress", { current: currentStep + 1, total: steps.length })}
          >
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-6 bg-orange-400" : i < currentStep ? "w-1.5 bg-green-400" : "w-1.5 bg-gray-700"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            onClick={onFinish}
            className="text-xs text-gray-500 hover:text-gray-300 font-medium px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-label={t("onboarding.skip")}
          >
            {t("onboarding.skip")}
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-center">
          <div className={`w-20 h-20 ${step.bgColor} rounded-3xl flex items-center justify-center mx-auto mb-5`} aria-hidden="true">
            <Icon size={36} className={step.color} />
          </div>
          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2" aria-hidden="true">
            {t("onboarding.stepLabel", { current: currentStep + 1, total: steps.length })}
          </p>
          <h3 className="text-2xl font-bold text-white mb-3" id="onboarding-title">
            {step.titleKey}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed" id="onboarding-desc">
            {step.descKey}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          {currentStep > 0 && (
            <button
              onClick={goBack}
              className="w-full h-10 bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm rounded-xl transition-colors"
              aria-label={t("common.previous")}
            >
              {t("common.previous")}
            </button>
          )}
          <Button
            onClick={goNext}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold text-base rounded-2xl shadow-lg"
            aria-describedby="onboarding-title onboarding-desc"
          >
            {currentStep === steps.length - 1 ? (
              <>
                {t("onboarding.letsGo")} <Star size={18} className="ml-2" />
              </>
            ) : (
              <>
                {t("common.next")} <ChevronRight size={18} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  return useContext(Context);
}

export default OnboardingProvider;
