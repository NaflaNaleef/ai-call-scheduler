import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash.replace('#', ''));

    const type = hashParams.get('type');
    const code = params.get('code');
    const accessToken = hashParams.get('access_token');

    if (code) {
      // OAuth flow (Google, Microsoft) — has ?code= param
      supabase.auth.exchangeCodeForSession(window.location.href)
        .then(({ error }) => {
          if (error) {
            console.error("OAuth callback error:", error.message);
            navigate("/sign-in?error=oauth_failed", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        });
    } else if (accessToken && type === 'invite') {
      // Invite flow — Supabase auto-processes the hash token via
      // onAuthStateChange in AuthContext; send user to set their password
      navigate("/reset-password" + hash, { replace: true });
    } else if (accessToken && type === 'recovery') {
      // Password reset flow
      navigate("/reset-password" + hash, { replace: true });
    } else {
      // Fallback
      navigate("/dashboard", { replace: true });
    }
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh"
    }}>
      <div style={{
        width: 36, height: 36,
        border: "3px solid #e2e8f0",
        borderTopColor: "#6366f1",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
