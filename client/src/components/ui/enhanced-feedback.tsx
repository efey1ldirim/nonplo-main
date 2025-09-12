import { cn } from "@/lib/utils";
import { memo } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Enhanced notification system
export interface NotificationProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export const Notification = memo(({
  type,
  title,
  message,
  action,
  onClose,
  className
}: NotificationProps) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    warning: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
  };

  const iconColors = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    info: "text-blue-600 dark:text-blue-400"
  };

  const Icon = icons[type];

  return (
    <div className={cn(
      "relative p-4 border rounded-lg shadow-sm animate-in slide-in-from-right-2 duration-300",
      colors[type],
      className
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColors[type])} />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {message && (
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          )}
          
          {action && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={action.onClick}
                className="h-8 px-3 text-xs"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
});

// Progress indicator with steps
interface ProgressStepsProps {
  steps: Array<{
    label: string;
    description?: string;
  }>;
  currentStep: number;
  className?: string;
}

export const ProgressSteps = memo(({ 
  steps, 
  currentStep, 
  className 
}: ProgressStepsProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={index} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                isCompleted 
                  ? "bg-green-500 text-white" 
                  : isCurrent
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-0.5 h-8 mt-2 transition-colors duration-200",
                  isCompleted ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-8">
              <h4 className={cn(
                "text-sm font-medium transition-colors duration-200",
                isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
              )}>
                {step.label}
              </h4>
              
              {step.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Status indicator with different states
interface StatusIndicatorProps {
  status: "online" | "offline" | "loading" | "error" | "warning";
  label?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const StatusIndicator = memo(({
  status,
  label,
  size = "md",
  showLabel = true,
  className
}: StatusIndicatorProps) => {
  const sizes = {
    sm: "h-2 w-2",
    md: "h-3 w-3", 
    lg: "h-4 w-4"
  };

  const colors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    loading: "bg-blue-500 animate-pulse",
    error: "bg-red-500",
    warning: "bg-yellow-500"
  };

  const labels = {
    online: "Çevrimiçi",
    offline: "Çevrimdışı", 
    loading: "Bağlanıyor",
    error: "Hata",
    warning: "Uyarı"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-full border-2 border-white dark:border-gray-800 shadow-sm",
        sizes[size],
        colors[status]
      )} />
      
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {label || labels[status]}
        </span>
      )}
    </div>
  );
});

// Interactive tooltip with rich content
interface RichTooltipProps {
  title: string;
  content: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export const RichTooltip = memo(({
  title,
  content,
  action,
  children,
  side = "top"
}: RichTooltipProps) => {
  return (
    <div className="group relative inline-block">
      {children}
      
      <div className={cn(
        "absolute z-50 px-3 py-2 bg-popover border rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto",
        "w-64",
        side === "top" && "bottom-full mb-2 left-1/2 -translate-x-1/2",
        side === "bottom" && "top-full mt-2 left-1/2 -translate-x-1/2",
        side === "left" && "right-full mr-2 top-1/2 -translate-y-1/2",
        side === "right" && "left-full ml-2 top-1/2 -translate-y-1/2"
      )}>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{content}</p>
          
          {action && (
            <Button
              size="sm"
              variant="outline"
              onClick={action.onClick}
              className="h-7 px-2 text-xs w-full"
            >
              {action.label}
            </Button>
          )}
        </div>
        
        {/* Arrow */}
        <div className={cn(
          "absolute w-2 h-2 bg-popover border rotate-45",
          side === "top" && "top-full left-1/2 -translate-x-1/2 -mt-1 border-r-0 border-b-0",
          side === "bottom" && "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-0 border-t-0",
          side === "left" && "left-full top-1/2 -translate-y-1/2 -ml-1 border-t-0 border-r-0",
          side === "right" && "right-full top-1/2 -translate-y-1/2 -mr-1 border-b-0 border-l-0"
        )} />
      </div>
    </div>
  );
});

Notification.displayName = "Notification";
ProgressSteps.displayName = "ProgressSteps";
StatusIndicator.displayName = "StatusIndicator";
RichTooltip.displayName = "RichTooltip";