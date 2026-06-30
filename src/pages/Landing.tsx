import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Megaphone, Clock, BarChart3, Check, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">AI Call Scheduler</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            AI-Powered Calling Platform
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Automate Your Outbound Calls with AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create campaigns, add contacts, and let AI handle the conversations — automatically.
            Track results in real time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" asChild>
              <Link to="/sign-up">
                Start for Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Everything you need to scale outbound calling
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Megaphone}
              title="Smart Campaigns"
              description="Create AI calling campaigns with custom scripts, data collection fields, and intelligent conversation flows."
            />
            <FeatureCard
              icon={Clock}
              title="Automated Scheduling"
              description="Schedule immediate, one-time, or recurring campaigns with timezone-aware calling windows and days-of-week control."
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-time Results"
              description="Track call outcomes, view full transcripts, access recordings, and export collected data — all in one place."
            />
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free, scale as you grow</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <PlanCard
              name="Free"
              price="$0"
              features={["10 call minutes", "50 contacts", "3 campaigns", "Email support"]}
              cta="Get Started Free"
            />
            <PlanCard
              name="Starter"
              price="$29"
              features={["100 call minutes", "500 contacts", "10 campaigns", "Email support"]}
              cta="Get Started"
            />
            <PlanCard
              name="Pro"
              price="$79"
              features={["300 call minutes", "2,000 contacts", "50 campaigns", "Priority support"]}
              cta="Get Started"
              popular
            />
            <PlanCard
              name="Business"
              price="$199"
              features={[
                "800 call minutes",
                "Unlimited contacts",
                "Unlimited campaigns",
                "Priority support",
              ]}
              cta="Contact Sales"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
            <div className="space-y-1">
              <p className="font-semibold">AI Call Scheduler</p>
              <p className="text-sm text-muted-foreground">Automate your outbound calls with AI</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/sign-in" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link to="/sign-up" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t border-border pt-6">
            © 2026 AI Call Scheduler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 space-y-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  popular = false,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border p-6 flex flex-col gap-5 ${
        popular
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-background"
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-0.5 rounded-full bg-primary text-primary-foreground">
          Most Popular
        </span>
      )}
      <div>
        <p className="font-semibold text-base">{name}</p>
        <p className="text-2xl font-bold mt-1">
          {price}
          <span className="text-sm font-normal text-muted-foreground">/month</span>
        </p>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>
      <Button variant={popular ? "default" : "outline"} className="w-full" asChild>
        <Link to="/sign-up">{cta}</Link>
      </Button>
    </div>
  );
}
