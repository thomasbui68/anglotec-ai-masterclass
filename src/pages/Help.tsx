import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ScanFace, Mail, Shield, HelpCircle, Volume2, Trophy, Sparkles, LogOut } from "lucide-react";

const FAQS = [
  {
    q: "How do I start learning?",
    a: "From the Dashboard, tap 'Start Learning' or pick any topic from the category grid. You'll see flashcards with AI prompting phrases. Tap 'Listen' to hear pronunciation, then 'I Know This' when you feel confident, or 'Practice More' to review later.",
    icon: <BookOpen size={18} className="text-orange-500" />,
  },
  {
    q: "How do I set up Face ID login?",
    a: "Go to Settings and tap 'Set Up Face ID'. Your device will prompt you to use Face ID or fingerprint. Once registered, you can log in instantly without typing your password. If the button doesn't seem to work, make sure you're using Safari on iPhone or Chrome on Android.",
    icon: <ScanFace size={18} className="text-orange-500" />,
  },
  {
    q: "I forgot my password. What do I do?",
    a: "On the login screen, tap 'Forgot password?' You'll be guided through recovery using your security question, Face ID, backup email verification code, or phone SMS code — whichever you set up during registration.",
    icon: <HelpCircle size={18} className="text-orange-500" />,
  },
  {
    q: "How do I track my progress?",
    a: "Your Dashboard shows your mastery level, streak, badges, and overall progress bar. You earn XP for every correct answer and can climb from New Explorer all the way to AI Champion!",
    icon: <Trophy size={18} className="text-orange-500" />,
  },
  {
    q: "Does the audio work on my device?",
    a: "The 'Listen' button uses enhanced text-to-speech with smart voice selection. On iPhone, you'll hear the high-quality Samantha voice. On other devices, the app automatically picks the clearest available voice. You can customize your voice and speed in Settings > Voice & Audio. Works on all modern browsers including Safari, Chrome, and Edge.",
    icon: <Volume2 size={18} className="text-orange-500" />,
  },
  {
    q: "Is my data safe?",
    a: "Absolutely. Your account and all learning progress are stored securely on our cloud servers with encryption. You can log in from any device and pick up exactly where you left off. Your Face ID credential never leaves your device — it stays in your phone's secure hardware.",
    icon: <Shield size={18} className="text-orange-500" />,
  },
  {
    q: "Can I use this on multiple devices?",
    a: "Yes! Since your account is stored in the cloud, you can log in from any phone, tablet, or computer. Your progress, achievements, and settings will all be there waiting for you.",
    icon: <Sparkles size={18} className="text-orange-500" />,
  },
  {
    q: "How do I sign out?",
    a: "Go to Settings and tap 'Sign Out' at the bottom. Your account stays safe in the cloud and everything will be right there when you log back in.",
    icon: <LogOut size={18} className="text-orange-500" />,
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec" className="h-10 w-10 object-contain drop-shadow-lg rounded-xl" />
            <div>
              <h1 className="text-base font-bold tracking-wide">Anglotec AI</h1>
              <p className="text-xs text-orange-400">Help & Support</p>
            </div>
          </div>
          <Link to="/">
            <button className="flex items-center gap-1 text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="text-center mb-8">
          <HelpCircle size={48} className="mx-auto text-orange-500 mb-3" />
          <h2 className="text-2xl font-bold text-[#1a365d]">How Can We Help?</h2>
          <p className="text-gray-500 mt-1">Everything you need to get the most from Anglotec AI Master Class.</p>
        </div>

        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-orange-600 shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-[#1a365d]">Need more help?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Contact the Anglotec AI Apps support team at{" "}
                  <a href="mailto:support@anglotec-ai.com" className="text-orange-600 hover:text-orange-700 font-medium underline">support@anglotec-ai.com</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {faq.icon}
                  {faq.q}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/">
            <button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 py-3 font-semibold transition-colors">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
