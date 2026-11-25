import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function GoogleCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);

    const token = hashParams.get("token");
    const error = queryParams.get("error") || hashParams.get("error");

    if (token) {
      login(token);
      window.history.replaceState(null, "", "/");
      toast.success("Signed in with Google!");
      navigate("/", { replace: true });
      return;
    }

    toast.error(error || "Google authentication failed.");
    navigate("/login", { replace: true });
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-maroon/20 border-t-maroon rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Completing Google Sign-In...</p>
      </div>
    </div>
  );
}
