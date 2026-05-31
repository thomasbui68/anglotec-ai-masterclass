import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "@/i18n";

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = (code: string, dir: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = dir;
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/80 hover:text-white text-xs"
        title="Change language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="font-bold uppercase tracking-wider hidden sm:inline">{current.code}</span>
        <Globe size={13} className="ml-0.5 opacity-60 hidden sm:inline" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-[#1a2332] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code, lang.dir)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  current.code === lang.code
                    ? "bg-orange-500/20 text-orange-300"
                    : "hover:bg-white/5 text-gray-300"
                }`}
              >
                <span className="text-lg leading-none">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lang.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{lang.code}</p>
                </div>
                {current.code === lang.code && (
                  <Check size={14} className="text-orange-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
