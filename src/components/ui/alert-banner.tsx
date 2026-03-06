import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useState } from "react";

const alertBannerVariants = cva(
  "flex items-start gap-3 p-4 rounded-lg text-sm border",
  {
    variants: {
      variant: {
        success: "bg-accent/5 border-accent/20 text-accent",
        error: "bg-destructive/5 border-destructive/20 text-destructive",
        warning: "bg-warning/5 border-warning/20 text-warning",
        info: "bg-info/5 border-info/20 text-info",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

interface AlertBannerProps extends VariantProps<typeof alertBannerVariants> {
  title?: string;
  message: string;
  dismissible?: boolean;
}

export function AlertBanner({ variant = "info", title, message, dismissible }: AlertBannerProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const Icon = iconMap[variant || "info"];

  return (
    <div className={cn(alertBannerVariants({ variant }))}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <p className="opacity-90">{message}</p>
      </div>
      {dismissible && (
        <button onClick={() => setVisible(false)} className="opacity-60 hover:opacity-100 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
