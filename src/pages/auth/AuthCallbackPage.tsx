import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
      if (error) {
        console.error("OAuth callback error:", error.message);
        navigate("/sign-in?error=oauth_failed", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    });
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
