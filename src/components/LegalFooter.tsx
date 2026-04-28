import { ShieldCheck, ExternalLink, Heart } from "lucide-react";

export function LegalFooter() {
  return (
    <footer className="bg-[#0a0f1c] border-t border-white/5 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Heart size={12} className="text-orange-500" />
            <span>© 2026 Anglotec AI. All rights reserved.</span>
          </div>

          {/* Right: Legal links */}
          <div className="flex items-center gap-4 text-xs">
            <a
              href="https://new.anglotec.com/en/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-400 hover:text-orange-400 transition-colors"
            >
              <ShieldCheck size={12} />
              Terms & Conditions
              <ExternalLink size={10} className="opacity-50" />
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="https://new.anglotec.com/en/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-400 hover:text-orange-400 transition-colors"
            >
              <ShieldCheck size={12} />
              Privacy Policy
              <ExternalLink size={10} className="opacity-50" />
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="https://new.anglotec.com/en/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-400 hover:text-orange-400 transition-colors"
            >
              <ShieldCheck size={12} />
              GDPR / Cookie Policy
              <ExternalLink size={10} className="opacity-50" />
            </a>
          </div>
        </div>

        {/* GDPR note */}
        <p className="text-center text-[10px] text-gray-600 mt-3 max-w-2xl mx-auto">
          Anglotec AI is committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. 
          For full details on how we collect, process, and store your data, please refer to our{" "}
          <a href="https://new.anglotec.com/en/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-400 underline">Privacy Policy</a>.
        </p>
      </div>
    </footer>
  );
}
