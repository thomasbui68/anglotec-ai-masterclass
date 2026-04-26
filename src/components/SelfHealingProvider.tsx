import { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

interface HealingContext {
  lastError: string | null;
  clearError: () => void;
}

const Context = createContext<HealingContext>({ lastError: null, clearError: () => {} });

export function SelfHealingProvider({ children }: { children: React.ReactNode }) {
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  return (
    <Context.Provider value={{ lastError, clearError }}>
      {children}
      {lastError && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] bg-red-50 border border-red-200 rounded-xl p-4 shadow-xl max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800 flex-1">{lastError}</p>
            <button onClick={clearError} className="text-xs text-red-500 font-medium shrink-0">Dismiss</button>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}

export function useSelfHealing() {
  return useContext(Context);
}
