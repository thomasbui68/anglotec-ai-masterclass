/**
 * Lightweight i18n — no npm dependencies.
 * Loads translation JSON files from /locales/ and provides useTranslation hook.
 * Same API as react-i18next: const { t, i18n } = useTranslation()
 * English translations are bundled synchronously — no fetch delay.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { EN_TRANSLATIONS } from "./en";

export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" as const },
  { code: "es", name: "Español", flag: "🇪🇸", dir: "ltr" as const },
  { code: "fr", name: "Français", flag: "🇫🇷", dir: "ltr" as const },
  { code: "de", name: "Deutsch", flag: "🇩🇪", dir: "ltr" as const },
  { code: "it", name: "Italiano", flag: "🇮🇹", dir: "ltr" as const },
  { code: "pt", name: "Português", flag: "🇵🇹", dir: "ltr" as const },
  { code: "nl", name: "Nederlands", flag: "🇳🇱", dir: "ltr" as const },
  { code: "pl", name: "Polski", flag: "🇵🇱", dir: "ltr" as const },
  { code: "ru", name: "Русский", flag: "🇷🇺", dir: "ltr" as const },
  { code: "zh", name: "中文", flag: "🇨🇳", dir: "ltr" as const },
  { code: "ja", name: "日本語", flag: "🇯🇵", dir: "ltr" as const },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" as const },
];

export type LanguageCode = "en" | "es" | "fr" | "de" | "it" | "pt" | "nl" | "pl" | "ru" | "zh" | "ja" | "ar";

interface I18nContextType {
  language: LanguageCode;
  changeLanguage: (lang: LanguageCode) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  ready: boolean;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  changeLanguage: () => {},
  t: (k: string) => k,
  dir: "ltr",
  ready: false,
});

// In-memory cache — English bundled, others loaded via fetch
const translations: Record<string, Record<string, string>> = {
  en: EN_TRANSLATIONS,
};

function getTranslation(flattened: Record<string, string>, key: string): string | undefined {
  if (flattened[key] !== undefined) return flattened[key];
  if (flattened[`translation.${key}`] !== undefined) return flattened[`translation.${key}`];
  return undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [ready, setReady] = useState(true); // English ready immediately

  // Detect browser language on mount
  useEffect(() => {
    const stored = localStorage.getItem("anglotec-language") as LanguageCode | null;
    if (stored && LANGUAGES.some(l => l.code === stored)) {
      setLanguage(stored);
    } else {
      const browserLang = navigator.language?.slice(0, 2);
      if (browserLang && LANGUAGES.some(l => l.code === browserLang)) {
        setLanguage(browserLang as LanguageCode);
      }
    }
  }, []);

  // Load non-English translations on demand
  useEffect(() => {
    if (language === "en") return;
    if (translations[language]) return;

    fetch(`/locales/${language}.json`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === "string") flat[k] = v;
          else if (typeof v === "object" && v !== null) {
            for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
              if (typeof v2 === "string") flat[`${k}.${k2}`] = v2;
              else if (typeof v2 === "object" && v2 !== null) {
                for (const [k3, v3] of Object.entries(v2 as Record<string, unknown>)) {
                  if (typeof v3 === "string") flat[`${k}.${k2}.${k3}`] = v3;
                }
              }
            }
          }
        }
        translations[language] = flat;
        setReady(r => !r);
        setTimeout(() => setReady(true), 0);
      })
      .catch(() => { translations[language] = {}; });
  }, [language]);

  const changeLanguage = useCallback((lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem("anglotec-language", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES.find(l => l.code === lang)?.dir || "ltr";
  }, []);

  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    const flat = translations[language] || translations["en"] || {};
    let text = getTranslation(flat, key) || getTranslation(translations["en"] || {}, key) || key;
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      }
    }
    return text;
  }, [language]);

  const dir = LANGUAGES.find(l => l.code === language)?.dir || "ltr";

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t, dir, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(ns?: string) {
  const ctx = useContext(I18nContext);
  const t = useCallback((key: string, options?: Record<string, string | number>) => {
    const fullKey = ns && !key.includes(":") ? `${ns}.${key}` : key;
    return ctx.t(fullKey, options);
  }, [ctx]);
  return { t, i18n: { language: ctx.language, changeLanguage: ctx.changeLanguage } };
}

export const i18n = {
  language: "en" as LanguageCode,
  changeLanguage: (lang: LanguageCode) => {
    i18n.language = lang;
    localStorage.setItem("anglotec-language", lang);
  },
  t: (key: string, options?: Record<string, string | number>): string => {
    let text = EN_TRANSLATIONS[key] || key;
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      }
    }
    return text;
  },
};

export default i18n;
