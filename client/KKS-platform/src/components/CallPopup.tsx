import { useState } from "react";
import { X, Phone, CheckCircle, AlertCircle, Loader2, Mic } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { initiateCall } from "../services/vapi.service";
import { vapiFormContent } from "../data/content";

interface CallPopupProps {
  open: boolean;
  onClose: () => void;
  onOpenVoice?: () => void;
}

type CallStatus = "form" | "calling" | "done" | "error";

export default function CallPopup({ open, onClose, onOpenVoice }: CallPopupProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<CallStatus>("form");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone || !course || !topic) {
      toast.error("Please fill in all fields");
      return;
    }
    setStatus("calling");
    try {
      await initiateCall({ phone, course, topic });
      setStatus("done");
      toast.success("Call request submitted!");
    } catch {
      setStatus("error");
      toast.error("Unable to start phone call.");
    }
  };

  const reset = () => {
    setStatus("form");
    setPhone("");
    setCourse("");
    setTopic("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative border border-gray-100 animate-scaleUp">
        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-maroon to-maroon-dark rounded-t-2xl px-6 py-5">
          <h3 className="font-heading text-xl font-bold text-white">Talk to Our AI Counselor</h3>
          <p className="text-white/80 text-sm mt-1">Request a phone callback or talk directly in your browser</p>
        </div>

        <div className="p-6">
          {status === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={user?.name || ""}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm transition-colors duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interested Course *</label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm transition-colors duration-200"
                >
                  <option value="">Select a course</option>
                  {vapiFormContent.courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to know? *</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm transition-colors duration-200"
                >
                  <option value="">Select a topic</option>
                  {vapiFormContent.topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-maroon text-white py-3 rounded-lg font-semibold hover:bg-maroon-dark transition-colors duration-200 shadow-md"
              >
                📞 Call Me Now
              </button>
            </form>
          )}

          {status === "calling" && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-maroon mx-auto animate-spin" />
              <h4 className="font-heading text-lg font-bold text-gray-900">Connecting to Calling Service...</h4>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Submitting your callback request for {phone}.
              </p>
            </div>
          )}

          {status === "done" && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <div>
                <h4 className="font-heading text-xl font-bold text-gray-900 mb-1">Call Request Sent</h4>
                <p className="text-gray-600 text-sm">
                  Your request has been sent to our AI counselor.
                </p>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-800 text-left">
                <p className="font-medium mb-1">📞 Note on Telephony Connection:</p>
                <p className="text-amber-700 leading-relaxed">
                  If the phone connection cannot be completed due to carrier or trial account restrictions, you can talk to Ava instantly right inside your browser.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {onOpenVoice && (
                  <button
                    onClick={() => {
                      handleClose();
                      onOpenVoice();
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all duration-200"
                  >
                    <Mic className="w-4 h-4" />
                    Talk to AI Voice Counselor
                  </button>
                )}

                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    onClick={reset}
                    className="text-maroon font-medium text-xs hover:underline"
                  >
                    Request Another Phone Call
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={handleClose}
                    className="text-gray-500 text-xs hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6 space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h4 className="font-heading text-xl font-bold text-gray-900 mb-1">Unable to Start Phone Call</h4>
                <p className="text-gray-600 text-sm max-w-sm mx-auto">
                  We couldn't connect the phone call through the telephony provider. You can speak with Ava directly in your browser with zero delay.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {onOpenVoice && (
                  <button
                    onClick={() => {
                      handleClose();
                      onOpenVoice();
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all duration-200"
                  >
                    <Mic className="w-4 h-4" />
                    Talk to AI Voice Counselor
                  </button>
                )}

                <button
                  onClick={reset}
                  className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Try Phone Call Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}