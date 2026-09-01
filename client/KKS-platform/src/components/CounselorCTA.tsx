import { useNavigate } from "react-router-dom";
import { images } from "../data/content";
import { PhoneCall, Mic } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface CounselorCTAProps {
  onOpenCall: () => void;
  onOpenVoice?: () => void;
}

export default function CounselorCTA({ onOpenCall, onOpenVoice }: CounselorCTAProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCallClick = () => {
    if (user) {
      onOpenCall();
    } else {
      navigate("/login");
    }
  };

  const handleVoiceClick = () => {
    if (user) {
      if (onOpenVoice) onOpenVoice();
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="relative py-20 overflow-hidden">
      <img src={images.moreStudents} alt="Students" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-maroon-dark/85" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider mb-3">
          Our AI & Expert Counsellors Are Just a Click Away
        </p>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
          Need Help Choosing <br className="hidden sm:block" />
          The Right University For You?
        </h2>
        <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
          Get real-time voice guidance on courses, admissions, fees, scholarships, and career paths with our AI counselor.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {onOpenVoice && (
            <button
              onClick={handleVoiceClick}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-xl hover:scale-105"
            >
              <Mic className="w-5 h-5" />
              Talk to AI Voice Counselor
            </button>
          )}
          <button
            onClick={handleCallClick}
            className="inline-flex items-center gap-2 bg-white text-maroon px-8 py-4 rounded-xl font-semibold text-lg hover:bg-amber-300 hover:text-maroon-dark transition-colors duration-300 shadow-lg"
          >
            <PhoneCall className="w-5 h-5" />
            Request Phone Callback
          </button>
        </div>
      </div>
    </section>
  );
}