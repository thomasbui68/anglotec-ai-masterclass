import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getStorageStatus } from "@/lib/local-db";

export default function StorageWarning() {
  const [status, setStatus] = useState<{ works: boolean; error: string | null } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStatus(getStorageStatus());
  }, []);

  if (!status || status.works || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 text-center text-sm font-medium shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>{status.error} Your account and progress may not be saved.</span>
        <button onClick={() => setDismissed(true)} className="ml-2 p-1 hover:bg-white/20 rounded" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
