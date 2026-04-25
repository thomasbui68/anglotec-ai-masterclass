import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
      <div className="text-center">
        <img src="/app-icon.png" alt="Anglotec" className="h-16 w-16 object-contain mx-auto mb-6 opacity-80" />
        <SearchX size={64} className="mx-auto mb-4 text-orange-400" />
        <h1 className="text-4xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved. Let's get you back to learning.
        </p>
        <Link to="/">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-8 text-base">
            <Home size={20} className="mr-2" /> Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
