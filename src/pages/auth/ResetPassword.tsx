import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/ui/alert-banner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function getPasswordStrength(pw: string): { label: string; value: number; color: string } {
  if (pw.length < 8) return { label: "Too short", value: 15, color: "bg-destructive" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Weak", value: 33, color: "bg-destructive" };
  if (score <= 3) return { label: "Medium", value: 60, color: "bg-warning" };
  return { label: "Strong", value: 100, color: "bg-accent" };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    async function handleRecovery() {
      const hash = window.location.hash;
      if (!hash) {
          setVerifying(false);
          return;
      }

      const params = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      const errorCode = params.get('error_code');

      if (errorCode === 'otp_expired' || !accessToken || type !== 'recovery') {
        if (errorCode === 'otp_expired') {
            setTokenExpired(true);
            setError("This password reset link has expired. Please request a new one.");
        }
        setVerifying(false);
        return;
      }

      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });
        if (error) throw error;
      } catch (err: any) {
        setError(err.message || "Failed to verify reset link.");
      } finally {
        setVerifying(false);
      }
    }

    handleRecovery();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return;
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const pwStrength = getPasswordStrength(newPassword);
  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;

  if (verifying) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link
            to="/"
            className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center transition-opacity duration-150 hover:opacity-90"
            aria-label="Back to home"
          >
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </Link>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-[22px] font-semibold text-card-foreground mb-1">
              Reset Password
            </h1>
            <p className="text-sm text-muted-foreground">
              {success ? "Your password has been updated." : "Set a new password for your account."}
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <AlertBanner variant="error" message={error} dismissible={!tokenExpired} />
            </div>
          )}

          {success && (
            <div className="mb-4">
              <AlertBanner variant="success" message="Password reset successfully! Redirecting to login..." />
            </div>
          )}

          {tokenExpired ? (
             <Button className="w-full mt-2" variant="outline" asChild>
                <Link to="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Link>
             </Button>
          ) : !success && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={cn("pr-10")}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Strength:</span>
                      <span className={cn(
                        "text-xs font-medium",
                        pwStrength.value === 100 ? "text-accent" : pwStrength.value >= 60 ? "text-warning" : "text-destructive"
                      )}>
                        {pwStrength.label}
                      </span>
                    </div>
                    <Progress value={pwStrength.value} className="h-1.5" indicatorClassName={pwStrength.color} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting…
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}

          {!tokenExpired && !success && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline transition-colors duration-150 font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
