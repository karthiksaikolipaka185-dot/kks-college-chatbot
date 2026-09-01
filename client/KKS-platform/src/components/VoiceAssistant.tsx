import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, RotateCcw, Sparkles, AlertCircle, Bot, User, Square } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendMessage } from "../services/chat.service";

interface VoiceAssistantProps {
  open: boolean;
  onClose: () => void;
}

type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "error" | "unsupported";

interface Turn {
  id: number;
  sender: "user" | "bot";
  text: string;
  time: string;
}

export default function VoiceAssistant({ open, onClose }: VoiceAssistantProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("Tap the microphone to speak");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const turnsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, interimTranscript]);

  // Initial welcome turn
  useEffect(() => {
    if (open && turns.length === 0) {
      const welcome: Turn = {
        id: Date.now(),
        sender: "bot",
        text: `Hello ${user?.name ? user.name.split(" ")[0] : "there"}! I'm KKS AI Voice Counselor. Ask me any question about admissions, courses, fees, or placements.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setTurns([welcome]);
    }
  }, [open, user, turns.length]);

  // Stop TTS speech cleanly
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
  }, []);

  // Text-to-speech using browser SpeechSynthesis
  const speakResponse = useCallback(
    (text: string) => {
      if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setStatus("idle");
        setStatusMessage("Tap the microphone to speak");
        return;
      }

      stopSpeaking();

      // Clean markdown, bullet points, asterisks for natural voice flow
      const cleanText = text
        .replace(/[*_#`~>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/•|\-/g, "")
        .replace(/\n+/g, ". ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Select high-quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang === "en-IN") ||
        voices.find((v) => v.lang === "en-US" && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setStatus("speaking");
        setStatusMessage("KKS AI is speaking...");
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setStatus("idle");
        setStatusMessage("Tap the microphone to ask another question");
      };

      utterance.onerror = (e) => {
        console.warn("[VoiceAssistant TTS Warning]", e);
        isSpeakingRef.current = false;
        setStatus("idle");
        setStatusMessage("Tap the microphone to speak");
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, stopSpeaking]
  );

  // Send question to existing KKS RAG backend
  const handleQuery = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) {
        setStatus("idle");
        setStatusMessage("I didn't catch that. Tap the microphone to try again.");
        return;
      }

      const userTurn: Turn = {
        id: Date.now(),
        sender: "user",
        text: queryText.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setTurns((prev) => [...prev, userTurn]);
      setInterimTranscript("");
      setStatus("processing");
      setStatusMessage("Thinking... Grounding answer from KKS knowledge base");

      try {
        // Reuse existing /api/chat/message via sendMessage
        const res = await sendMessage(queryText.trim());
        const botResponseText = res?.message || "I couldn't find relevant information in the knowledge base.";

        const botTurn: Turn = {
          id: Date.now() + 1,
          sender: "bot",
          text: botResponseText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setTurns((prev) => [...prev, botTurn]);
        speakResponse(botResponseText);
      } catch (err: any) {
        console.error("[VoiceAssistant RAG Error]", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to reach KKS RAG service.");
        setStatusMessage("Something went wrong. Please try again.");

        const errorTurn: Turn = {
          id: Date.now() + 1,
          sender: "bot",
          text: "I encountered an error connecting to the server. Please check your connection and try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setTurns((prev) => [...prev, errorTurn]);
      }
    },
    [speakResponse]
  );

  // Stop recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Recognition stop error", e);
      }
      isListeningRef.current = false;
    }
  }, []);

  // Start speech recognition
  const startListening = useCallback(() => {
    // Interruption / Barge-in: cancel active TTS if speaking
    stopSpeaking();

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setStatus("unsupported");
      setStatusMessage("Voice input isn't supported in this browser. Please use Chrome or Edge, or continue using text chat.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setStatus("listening");
        setStatusMessage("Listening... Speak your question now");
        setInterimTranscript("");
        setErrorMessage("");
      };

      recognition.onresult = (event: any) => {
        let finalTrans = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (finalTrans) {
          setInterimTranscript(finalTrans);
          stopListening();
          handleQuery(finalTrans);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[SpeechRecognition Error]", event.error);
        isListeningRef.current = false;

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setStatus("error");
          setErrorMessage("Microphone access was denied. Please allow microphone permissions in your browser address bar.");
          setStatusMessage("Microphone permission denied");
        } else if (event.error === "no-speech") {
          setStatus("idle");
          setStatusMessage("No speech was detected. Tap the mic to try again.");
        } else if (event.error === "network") {
          setStatus("error");
          setErrorMessage("Network issue during speech recognition. Please check your internet connection.");
          setStatusMessage("Network error during speech recognition");
        } else {
          setStatus("error");
          setErrorMessage(`Speech recognition error: ${event.error}`);
          setStatusMessage("Could not capture speech. Tap the mic to try again.");
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        // If ended without final result and status is still listening
        setStatus((curr) => (curr === "listening" ? "idle" : curr));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("[SpeechRecognition Init Error]", err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to initialize microphone.");
      setStatusMessage("Could not start microphone");
    }
  }, [handleQuery, stopListening, stopSpeaking]);

  // Toggle mic button action (start / stop / interrupt)
  const handleMicClick = () => {
    if (status === "speaking") {
      // Interruption: stop speech and immediately listen
      stopSpeaking();
      startListening();
    } else if (status === "listening") {
      stopListening();
      setStatus("idle");
      setStatusMessage("Voice session paused. Tap to speak.");
    } else {
      startListening();
    }
  };

  // Reset conversation
  const handleReset = () => {
    stopSpeaking();
    stopListening();
    setStatus("idle");
    setStatusMessage("Tap the microphone to speak");
    setInterimTranscript("");
    setErrorMessage("");
    setTurns([
      {
        id: Date.now(),
        sender: "bot",
        text: `Hi ${user?.name ? user.name.split(" ")[0] : "there"}! I'm KKS AI Voice Counselor. What would you like to know about KKS College?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Close modal and cleanup audio
  const handleClose = () => {
    stopSpeaking();
    stopListening();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopSpeaking, stopListening]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-assistant-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-maroon/20 relative animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon to-maroon-dark px-6 py-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 id="voice-assistant-title" className="font-heading font-bold text-lg leading-tight flex items-center gap-2">
                KKS AI Voice Counselor
                <span className="text-[10px] uppercase font-semibold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/30">
                  Live Voice
                </span>
              </h2>
              <p className="text-xs text-white/80">Real-time KKS Knowledge Grounding</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute TTS toggle */}
            <button
              onClick={() => {
                if (!isMuted && status === "speaking") stopSpeaking();
                setIsMuted(!isMuted);
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
              aria-label={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-300" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Reset conversation */}
            <button
              onClick={handleReset}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Reset Conversation"
              aria-label="Reset Conversation"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Close Voice Assistant"
              aria-label="Close Voice Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation Transcript Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/70 min-h-[220px] max-h-[340px]">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex items-start gap-3 ${turn.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {turn.sender === "bot" && (
                <div className="w-8 h-8 rounded-full bg-maroon text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  turn.sender === "user"
                    ? "bg-maroon text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{turn.text}</p>
                <span
                  className={`block text-[10px] mt-1.5 ${
                    turn.sender === "user" ? "text-white/70 text-right" : "text-gray-400 text-left"
                  }`}
                >
                  {turn.time}
                </span>
              </div>

              {turn.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Live transcript during speech */}
          {interimTranscript && (
            <div className="flex items-start gap-3 justify-end animate-fadeIn">
              <div className="max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-maroon/80 text-white italic rounded-br-none border border-maroon">
                <span className="text-xs text-amber-200 block not-italic font-semibold mb-1">Hearing:</span>
                "{interimTranscript}"
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            </div>
          )}

          <div ref={turnsEndRef} />
        </div>

        {/* Status & Visualizer Panel */}
        <div className="bg-white border-t border-gray-100 px-6 py-6 flex flex-col items-center justify-center space-y-4">
          {/* Status badge */}
          <div className="text-center">
            <p
              className={`text-sm font-semibold transition-colors duration-200 ${
                status === "listening"
                  ? "text-red-600 animate-pulse"
                  : status === "processing"
                  ? "text-amber-600"
                  : status === "speaking"
                  ? "text-maroon"
                  : status === "error"
                  ? "text-red-500"
                  : "text-gray-600"
              }`}
            >
              {statusMessage}
            </p>
            {errorMessage && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Interactive Mic Control / Audio Visualizer Ring */}
          <div className="relative flex items-center justify-center">
            {/* Animated outer pulsing rings */}
            {status === "listening" && (
              <>
                <div className="absolute w-28 h-28 rounded-full bg-red-500/20 animate-ping" />
                <div className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-pulse" />
              </>
            )}

            {status === "speaking" && (
              <>
                <div className="absolute w-28 h-28 rounded-full bg-maroon/20 animate-ping" />
                <div className="absolute w-24 h-24 rounded-full bg-maroon/30 animate-pulse" />
              </>
            )}

            {status === "processing" && (
              <div className="absolute w-24 h-24 rounded-full border-4 border-amber-500/30 border-t-amber-600 animate-spin" />
            )}

            {/* Central Action Button */}
            <button
              onClick={handleMicClick}
              disabled={status === "unsupported"}
              aria-label={
                status === "listening"
                  ? "Stop listening"
                  : status === "speaking"
                  ? "Interrupt and speak new question"
                  : "Start speaking"
              }
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-maroon/30 ${
                status === "listening"
                  ? "bg-red-600 text-white hover:bg-red-700 scale-105"
                  : status === "speaking"
                  ? "bg-maroon text-white hover:bg-maroon-dark scale-105"
                  : status === "processing"
                  ? "bg-amber-600 text-white cursor-wait"
                  : "bg-maroon text-white hover:bg-maroon-dark hover:scale-105"
              }`}
            >
              {status === "listening" ? (
                <Mic className="w-9 h-9 animate-bounce" />
              ) : status === "speaking" ? (
                <Square className="w-8 h-8 fill-current" />
              ) : status === "unsupported" ? (
                <MicOff className="w-8 h-8 opacity-60" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Quick Action Hints / Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            {status === "speaking" ? (
              <button
                onClick={stopSpeaking}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center gap-1.5 transition-colors font-medium"
              >
                <Square className="w-3 h-3 fill-current text-gray-600" />
                Stop Speaking
              </button>
            ) : status === "listening" ? (
              <button
                onClick={stopListening}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-full flex items-center gap-1.5 transition-colors font-medium"
              >
                <Square className="w-3 h-3 fill-current text-red-600" />
                Done Speaking
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-gray-400">Try saying:</span>
                {[
                  "What is the fee structure?",
                  "Tell me about placements",
                  "How to apply for admissions?",
                ].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => handleQuery(sample)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-maroon/10 hover:text-maroon text-gray-600 rounded-full transition-colors text-[11px]"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
