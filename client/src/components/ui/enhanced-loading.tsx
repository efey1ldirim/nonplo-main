import { cn } from "@/lib/utils";
import { memo } from "react";
import { Loader2, Zap, CheckCircle, AlertCircle } from "lucide-react";

// Enhanced loading spinner with different states
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "success" | "warning" | "pulse";
  className?: string;
}

export const LoadingSpinner = memo(({ 
  size = "md", 
  variant = "default",
  className 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const variantClasses = {
    default: "text-primary",
    success: "text-green-500",
    warning: "text-yellow-500",
    pulse: "text-primary animate-pulse"
  };

  if (variant === "success") {
    return (
      <CheckCircle 
        className={cn(
          sizeClasses[size], 
          "text-green-500 animate-in zoom-in-95 duration-200",
          className
        )} 
      />
    );
  }

  if (variant === "warning") {
    return (
      <AlertCircle 
        className={cn(
          sizeClasses[size], 
          "text-yellow-500 animate-bounce",
          className
        )} 
      />
    );
  }

  return (
    <Loader2 
      className={cn(
        "animate-spin",
        sizeClasses[size],
        variantClasses[variant],
        className
      )} 
    />
  );
});

// Progressive loading component with phases
interface ProgressiveLoaderProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const ProgressiveLoader = memo(({ 
  steps, 
  currentStep, 
  className 
}: ProgressiveLoaderProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
              index < currentStep 
                ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300" 
                : index === currentStep
                ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            {index < currentStep ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : index === currentStep ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className="text-sm font-medium">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Skeleton variants for different content types
interface SkeletonContentProps {
  type: "card" | "list" | "profile" | "chart" | "form";
  className?: string;
}

export const SkeletonContent = memo(({ type, className }: SkeletonContentProps) => {
  const cardSkeleton = (
    <div className="space-y-4 p-6 border rounded-lg">
      <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
      <div className="h-20 bg-muted rounded animate-pulse" />
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );

  const listSkeleton = (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border rounded">
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );

  const profileSkeleton = (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 bg-muted rounded-full animate-pulse" />
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded w-32 animate-pulse" />
        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
        <div className="h-3 bg-muted rounded w-20 animate-pulse" />
      </div>
    </div>
  );

  const chartSkeleton = (
    <div className="space-y-4">
      <div className="h-6 bg-muted rounded w-48 animate-pulse" />
      <div className="h-48 bg-muted rounded animate-pulse" />
      <div className="flex justify-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );

  const formSkeleton = (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-28 animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-10 bg-muted rounded w-24 animate-pulse" />
    </div>
  );

  const skeletons = {
    card: cardSkeleton,
    list: listSkeleton,
    profile: profileSkeleton,
    chart: chartSkeleton,
    form: formSkeleton
  };

  return (
    <div className={cn("animate-in fade-in-50 duration-300", className)}>
      {skeletons[type]}
    </div>
  );
});

// Smart loading state that adapts to content
interface SmartLoadingProps {
  isLoading: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: React.ReactNode;
}

export const SmartLoading = memo(({
  isLoading,
  error,
  isEmpty,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children
}: SmartLoadingProps) => {
  if (error) {
    return (
      errorComponent || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Bir hata oluştu
          </h3>
          <p className="text-muted-foreground mb-4">
            {error.message || "Beklenmeyen bir hata oluştu"}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )
    );
  }

  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      )
    );
  }

  if (isEmpty) {
    return (
      emptyComponent || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Henüz veri yok
          </h3>
          <p className="text-muted-foreground">
            İçerik yüklendiğinde burada görünecek
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
});

LoadingSpinner.displayName = "LoadingSpinner";
ProgressiveLoader.displayName = "ProgressiveLoader";
SkeletonContent.displayName = "SkeletonContent";
SmartLoading.displayName = "SmartLoading";