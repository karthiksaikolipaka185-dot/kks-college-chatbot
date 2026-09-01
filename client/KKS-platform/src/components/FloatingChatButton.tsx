import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Mic } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ChatDrawer from "./ChatDrawer";
import VoiceAssistant from "./VoiceAssistant";

export default function FloatingChatButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const handleChatClick = () => {
    if (user) {
      setChatOpen(!chatOpen);
    } else {
      navigate("/login");
    }
  };

  const handleVoiceClick = () => {
    if (user) {
      setChatOpen(false);
      setVoiceOpen(true);
    } else {
      navigate("/login");
    }
  };

  return (
    <>
      {/* Chat drawer popup */}
      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onOpenVoice={() => {
          setChatOpen(false);
          setVoiceOpen(true);
        }}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistant open={voiceOpen} onClose={() => setVoiceOpen(false)} />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Voice AI Button */}
        <button
          onClick={handleVoiceClick}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          title={user ? "Talk to KKS AI Voice Counselor" : "Login for Voice Counselor"}
          aria-label="Talk to KKS AI Voice Counselor"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Text Chat Button */}
        <button
          onClick={handleChatClick}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-maroon ${
            chatOpen ? "bg-gray-600 hover:bg-gray-700" : "bg-maroon hover:bg-maroon-dark"
          }`}
          title={user ? "Chat with KKS Bot" : "Login to chat"}
          aria-label="Chat with KKS Bot"
        >
          {chatOpen ? (
            <MessageCircle className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white animate-bounce [animation-duration:2s] [animation-iteration-count:3]" />
          )}
        </button>
      </div>
    </>
  );
}