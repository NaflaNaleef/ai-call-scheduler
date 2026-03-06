import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
}

export function LoadingSpinner({ className, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className={cn("h-6 w-6 text-primary animate-spin-slow", className)} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
