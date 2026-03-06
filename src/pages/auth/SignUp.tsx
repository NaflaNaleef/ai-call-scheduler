import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/ui/alert-banner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  const { signUp, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });

  const validation = {
    name: touched.name && form.name.trim().length < 2,
    email: touched.email && !form.email.includes("@"),
    password: touched.password && form.password.length < 8,
    confirm: touched.confirm && form.confirm !== form.password,
  };

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }
  function blur(field: keyof typeof touched) {
    return () => setTouched((t) => ({ ...t, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.values(validation).some(Boolean) || !form.email || !form.password || !form.confirm)
      return;

    setLoading(true);
    setError(null);
    try {
      await signUp(form.email, form.password);
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-[22px] font-semibold text-card-foreground mb-1">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Start your free SaaSDash trial today
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <AlertBanner variant="error" message={error} dismissible />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={form.name}
                onChange={set("name")}
                onBlur={blur("name")}
                className={cn(validation.name && "border-destructive focus-visible:ring-destructive")}
                disabled={loading}
              />
              {validation.name && <p className="text-xs text-destructive">Please enter your full name.</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={set("email")}
                onBlur={blur("email")}
                className={cn(validation.email && "border-destructive focus-visible:ring-destructive")}
                disabled={loading}
              />
              {validation.email && <p className="text-xs text-destructive">Please enter a valid email.</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set("password")}
                  onBlur={blur("password")}
                  className={cn("pr-10", validation.password && "border-destructive focus-visible:ring-destructive")}
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
              {validation.password && <p className="text-xs text-destructive">Password must be at least 8 characters.</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  onBlur={blur("confirm")}
                  className={cn("pr-10", validation.confirm && "border-destructive focus-visible:ring-destructive")}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {validation.confirm && <p className="text-xs text-destructive">Passwords do not match.</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/sign-in" className="text-primary hover:underline transition-colors duration-150 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
