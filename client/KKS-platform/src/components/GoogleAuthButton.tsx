import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { getGoogleConfig, googleAuth } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

interface GoogleCodeResponse {
  code?: string;
  error?: string;
  error_description?: string;
}

interface GoogleCodeClient {
  requestCode: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup" | "redirect";
            callback: (response: GoogleCodeResponse) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => GoogleCodeClient;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  label?: string;
  onSuccess?: () => void;
}

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const loadGoogleIdentityScript = (): Promise<boolean> => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`,
    );

    const checkReady = () => {
      resolve(Boolean(window.google?.accounts?.oauth2));
    };

    if (existingScript) {
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (window.google?.accounts?.oauth2 || attempts >= 25) {
          window.clearInterval(timer);
          checkReady();
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => checkReady();
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

export default function GoogleAuthButton({
  label = "Continue with Google",
  onSuccess,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const resolveClientId = async (): Promise<string | null> => {
    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (envClientId) return envClientId;

    try {
      const config = await getGoogleConfig();
      return config.clientId;
    } catch {
      return null;
    }
  };

  const redirectToBackendOAuth = () => {
    const baseUrl = (API.defaults.baseURL || "/api").replace(/\/$/, "");
    const redirectOrigin = encodeURIComponent(window.location.origin);
    window.location.href = `${baseUrl}/auth/google?redirect_origin=${redirectOrigin}`;
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const [clientId, scriptReady] = await Promise.all([
        resolveClientId(),
        loadGoogleIdentityScript(),
      ]);

      if (!clientId) {
        toast.error("Google Sign-In is not configured.");
        setLoading(false);
        return;
      }

      if (!scriptReady || !window.google?.accounts?.oauth2) {
        redirectToBackendOAuth();
        return;
      }

      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: async (response: GoogleCodeResponse) => {
          if (response.error || !response.code) {
            toast.error(response.error_description || "Google sign-in was cancelled.");
            setLoading(false);
            return;
          }

          try {
            const data = await googleAuth({ code: response.code });
            login(data.token, data.user);
            toast.success(`Welcome, ${data.user.name.split(" ")[0]}!`);
            onSuccess?.();
            navigate("/");
          } catch (err: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(err)
              ? err.response?.data?.message
              : undefined;
            toast.error(message || "Google authentication failed.");
          } finally {
            setLoading(false);
          }
        },
        error_callback: (err) => {
          if (err.type === "popup_failed_to_open") {
            redirectToBackendOAuth();
            return;
          }
          setLoading(false);
        },
      });

      codeClient.requestCode();
    } catch {
      toast.error("Could not start Google Sign-In. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors duration-200 shadow-xs cursor-pointer"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
        />
      </svg>
      <span>{loading ? "Connecting to Google..." : label}</span>
    </button>
  );
}
