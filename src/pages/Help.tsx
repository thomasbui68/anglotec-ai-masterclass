import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ScanFace, Mail, Shield, HelpCircle, Volume2, Trophy, Sparkles, LogOut } from "lucide-react";
import { useTranslation } from "@/i18n";

const FAQ_ICONS = [
  <BookOpen size={18} className="text-orange-500" />,
  <ScanFace size={18} className="text-orange-500" />,
  <HelpCircle size={18} className="text-orange-500" />,
  <Trophy size={18} className="text-orange-500" />,
  <Volume2 size={18} className="text-orange-500" />,
  <Shield size={18} className="text-orange-500" />,
  <Sparkles size={18} className="text-orange-500" />,
  <LogOut size={18} className="text-orange-500" />,
];

export default function Help() {
  const { t } = useTranslation();

  const faqs = [
    { q: t("help.faq1Q"), a: t("help.faq1A"), icon: FAQ_ICONS[0] },
    { q: t("help.faq2Q"), a: t("help.faq2A"), icon: FAQ_ICONS[1] },
    { q: t("help.faq3Q"), a: t("help.faq3A"), icon: FAQ_ICONS[2] },
    { q: t("help.faq4Q"), a: t("help.faq4A"), icon: FAQ_ICONS[3] },
    { q: t("help.faq5Q"), a: t("help.faq5A"), icon: FAQ_ICONS[4] },
    { q: t("help.faq6Q"), a: t("help.faq6A"), icon: FAQ_ICONS[5] },
    { q: t("help.faq7Q"), a: t("help.faq7A"), icon: FAQ_ICONS[6] },
    { q: t("help.faq8Q"), a: t("help.faq8A"), icon: FAQ_ICONS[7] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt={t("app.name")} className="h-10 w-10 object-contain drop-shadow-lg rounded-xl" />
            <div>
              <h1 className="text-base font-bold tracking-wide">{t("app.name")}</h1>
              <p className="text-xs text-orange-400">{t("help.title")}</p>
            </div>
          </div>
          <Link to="/">
            <button className="flex items-center gap-1 text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm transition-colors">
              <ArrowLeft size={16} /> {t("common.back")}
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="text-center mb-8">
          <HelpCircle size={48} className="mx-auto text-orange-500 mb-3" />
          <h2 className="text-2xl font-bold text-[#1a365d]">{t("help.heading")}</h2>
          <p className="text-gray-300 mt-1">{t("help.subheading")}</p>
        </div>

        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-orange-600 shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-[#1a365d]">{t("help.contactTitle")}</p>
                <p className="text-sm text-gray-300 mt-1">
                  {t("help.contactDesc")}{" "}
                  <a href="mailto:support@anglotec-ai.com" className="text-orange-600 hover:text-orange-700 font-medium underline">support@anglotec-ai.com</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {faq.icon}
                  {faq.q}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-300 leading-relaxed">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/">
            <button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 py-3 font-semibold transition-colors">
              {t("flashcards.backToDashboard")}
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
