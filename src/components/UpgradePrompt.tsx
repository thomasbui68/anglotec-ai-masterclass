import { useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, X, Lock, Volume2, TrendingUp, Star, Sparkles } from "lucide-react";
import { useState } from "react";

interface UpgradePromptProps {
  variant?: "banner" | "card" | "inline";
  feature?: string;
  onDismiss?: () => void;
  className?: string;
}

export function UpgradePrompt({ variant = "card", feature, onDismiss, className = "" }: UpgradePromptProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Banner variant (top of page)
  if (variant === "banner") {
    return (
      <div className={`bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-400/30 rounded-xl p-4 flex items-center gap-4 ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
          <Crown size={20} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {feature ? `Unlock "${feature}"` : "Ready for more?"}
          </p>
          <p className="text-xs text-gray-400">
            Get unlimited phrases, AI voice, and new content every week.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate("/pricing")}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
          >
            <Zap size={14} className="mr-1" /> See Plans
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Inline variant (small, within content)
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-xs text-orange-400 ${className}`}>
        <Lock size={12} />
        <span>
          {feature ? `${feature} is included with Pro.` : "This is a Pro feature."}
          <button
            onClick={() => navigate("/pricing")}
            className="ml-1 underline hover:text-orange-300 transition-colors font-semibold"
          >
            Unlock it
          </button>
        </span>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={`bg-white/5 border-orange-400/20 backdrop-blur-xl ${className}`}>
      <CardContent className="p-5 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center mx-auto mb-3">
          <Sparkles size={28} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {feature ? `Unlock "${feature}"` : "Go Pro"}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Upgrade to Pro for unlimited phrases, voice pronunciation, weekly updates, and more.
        </p>
        <div className="space-y-2 mb-4 text-left">
          {[
            { icon: Zap, text: "Unlimited phrases every day" },
            { icon: Volume2, text: "AI voice pronunciation" },
            { icon: TrendingUp, text: "New phrases every week" },
            { icon: Star, text: "14-day free trial" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-xs text-gray-300">
              <item.icon size={14} className="text-orange-400" />
              {item.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/pricing")}
            className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold"
          >
            <Zap size={16} className="mr-1" /> See Plans
          </Button>
          {onDismiss && (
            <Button variant="ghost" onClick={handleDismiss} className="h-11 text-gray-400 hover:text-white">
              Later
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Usage limit warning shown when free user approaches their daily limit
export function UsageLimitWarning({ used, limit, type = "phrases" }: { used: number; limit: number; type?: string }) {
  const navigate = useNavigate();
  const percentage = Math.round((used / limit) * 100);

  if (percentage < 70) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-3 flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-yellow-300 font-medium">
            {percentage >= 100
              ? "You have reached your daily limit"
              : `Almost there — ${percentage}% of daily ${type} used`}
          </span>
          <span className="text-[10px] text-gray-400">{used}/{limit}</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${percentage >= 100 ? "bg-orange-500" : "bg-yellow-500"}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>
      {percentage >= 100 && (
        <Button
          onClick={() => navigate("/pricing")}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-[10px] shrink-0"
        >
          Unlock More
        </Button>
      )}
    </div>
  );
}

// Trial countdown banner
export function TrialBanner({ trialEndsAt }: { trialEndsAt: Date | string | null | undefined }) {
  const navigate = useNavigate();

  if (!trialEndsAt) return null;

  const end = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return (
      <div className="bg-orange-500/10 border border-orange-400/20 rounded-xl p-4 flex items-center gap-4">
        <Crown size={20} className="text-orange-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Your free trial has ended</p>
          <p className="text-xs text-gray-400">Upgrade to keep unlimited access to all phrases.</p>
        </div>
        <Button
          onClick={() => navigate("/pricing")}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
        >
          See Plans
        </Button>
      </div>
    );
  }

  if (daysLeft <= 3) {
    return (
      <div className="bg-orange-500/10 border border-orange-400/20 rounded-xl p-4 flex items-center gap-4">
        <Crown size={20} className="text-orange-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in your free trial
          </p>
          <p className="text-xs text-gray-400">Choose a plan to keep uninterrupted access.</p>
        </div>
        <Button
          onClick={() => navigate("/pricing")}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
        >
          See Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-green-500/10 border border-green-400/20 rounded-lg p-3 flex items-center gap-3">
      <Crown size={16} className="text-green-400 shrink-0" />
      <p className="text-xs text-green-300">
        Pro trial active — {daysLeft} days remaining.
        <button onClick={() => navigate("/pricing")} className="ml-2 underline font-semibold hover:text-green-200">
          Choose your plan
        </button>
      </p>
    </div>
  );
}
