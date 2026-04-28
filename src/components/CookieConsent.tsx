import { useState, useEffect } from "react";
import { X, Cookie, ShieldCheck, ExternalLink } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    localStorage.setItem("cookie_consent_date", new Date().toISOString());
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-lg border-t border-white/10 p-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={20} className="text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-medium">
              We respect your privacy
            </p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              We use cookies to enhance your experience, serve personalised content, and analyse traffic. 
              By clicking "Accept All", you consent to our use of cookies in accordance with our{" "}
              <a
                href="https://new.anglotec.com/en/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="https://new.anglotec.com/en/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                Terms & Conditions
              </a>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Reject All
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            Accept All
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
