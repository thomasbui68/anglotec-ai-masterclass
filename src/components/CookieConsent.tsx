import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { useTranslation } from "@/i18n";

export function CookieConsent() {
  const { t } = useTranslation();
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
              {t("cookieConsent.title")}
            </p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              {t("cookieConsent.description")}{" "}
              <a
                href="https://new.anglotec.com/en/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                {t("cookieConsent.privacyPolicy")}
              </a>{" "}
              &amp;{" "}
              <a
                href="https://new.anglotec.com/en/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                {t("cookieConsent.termsConditions")}
              </a>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {t("cookieConsent.rejectAll")}
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            {t("cookieConsent.acceptAll")}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={t("cookieConsent.close")}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
