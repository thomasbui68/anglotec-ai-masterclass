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
    a: "Your Dashboard shows your mastery level, streak, badges, and overall progress bar. Tap 'View Progress' for detailed analytics including phrases mastered per category and your journey from Novice to AI Master.",
    icon: <Trophy size={18} className="text-orange-500" />,
  },
  {
    q: "Does the audio work on my device?",
    a: "The 'Listen' button uses enhanced text-to-speech with smart voice selection. On iPhone, you'll hear the high-quality Samantha voice. On other devices, the app automatically picks the clearest available voice. You can customize your voice and speed in Settings > Voice & Audio. Works on all modern browsers including Safari, Chrome, and Edge.",
    icon: <Volume2 size={18} className="text-orange-500" />,
  },
  {
    q: "Is my data private?",
    a: "Absolutely. All your learning data, account info, and Face ID credentials are stored only on your device. Nothing is sent to any server. Your Face ID credential lives in your device's secure hardware — we never see or store your face.",
    icon: <Shield size={18} className="text-orange-500" />,
  },
  {
    q: "Can I use this on multiple devices?",
    a: "Since all data is stored locally on your device, each device keeps its own copy. If you want to use the app on another device, you'll need to create a new account there. This ensures maximum privacy.",
    icon: <Sparkles size={18} className="text-orange-500" />,
  },
  {
    q: "How do I sign out?",
    a: "Tap the person icon or exit icon in the top-right corner of the Dashboard, then confirm sign out. Your data stays saved on the device for when you return.",
    icon: <LogOut size={18} className="text-orange-500" />,
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-white">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-base font-bold tracking-wide">Anglotec AI</h1>
              <p className="text-xs text-orange-400">Help & Support</p>
            </div>
          </div>
          <Link to="/">
            <button className="flex items-center gap-1 text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm transition-colors">
              <ArrowLeft size={16} /> Back to Dashboard
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

        {/* Contact */}
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

        {/* FAQ Grid */}
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

        {/* Re-show tutorial */}
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
