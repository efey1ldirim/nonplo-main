import { cn } from "@/lib/utils";
import { memo, useState } from "react";
import { AlertTriangle, RefreshCw, Home, Mail, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Enhanced error display with recovery options
interface ErrorDisplayProps {
  error: Error | string;
  title?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  onContact?: () => void;
  className?: string;
}

export const ErrorDisplay = memo(({
  error,
  title = "Bir hata oluştu",
  showDetails = false,
  onRetry,
  onGoHome,
  onContact,
  className
}: ErrorDisplayProps) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const { toast } = useToast();
  
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' && error.stack ? error.stack : null;

  const copyErrorToClipboard = async () => {
    const errorText = `Error: ${errorMessage}\n${errorStack ? `Stack: ${errorStack}` : ''}`;
    try {
      await navigator.clipboard.writeText(errorText);
      toast({
        title: "Kopyalandı",
        description: "Hata detayları panoya kopyalandı",
      });
    } catch {
      toast({
        title: "Kopyalanamadı",
        description: "Hata detayları kopyalanırken bir sorun oluştu",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={cn(
      "max-w-md w-full mx-auto p-6 bg-card border rounded-lg shadow-lg text-center space-y-4",
      className
    )}>
      <div className="flex flex-col items-center space-y-3">
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-full">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {errorMessage || "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          {onGoHome && (
            <Button variant="outline" onClick={onGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Ana Sayfa
            </Button>
          )}
          
          {onContact && (
            <Button variant="outline" onClick={onContact}>
              <Mail className="h-4 w-4 mr-2" />
              Destek
            </Button>
          )}
        </div>
      </div>

      {/* Error details section */}
      {(showDetails || process.env.NODE_ENV === 'development') && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="text-xs"
          >
            {showErrorDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Detayları Gizle
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Hata Detayları
              </>
            )}
          </Button>

          {showErrorDetails && (
            <div className="bg-muted p-3 rounded text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-muted-foreground">
                  Error Details
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyErrorToClipboard}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              
              <pre className="text-xs font-mono overflow-auto max-h-32 text-foreground">
                {errorMessage}
                {errorStack && `\n\n${errorStack}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Boundary wrapper for error handling
interface ErrorBoundaryWrapperProps {
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

export class ErrorBoundaryWrapper extends React.Component<
  ErrorBoundaryWrapperProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundaryWrapper caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <this.props.fallback error={this.state.error!} retry={this.retry} />;
      }

      return (
        <ErrorDisplay
          error={this.state.error!}
          onRetry={this.retry}
          onGoHome={() => window.location.href = '/dashboard'}
          showDetails={true}
        />
      );
    }

    return this.props.children;
  }
}

// Inline error message component
interface InlineErrorProps {
  message: string;
  className?: string;
}

export const InlineError = memo(({ message, className }: InlineErrorProps) => {
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded border border-red-200 dark:border-red-800",
      className
    )}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
});

// Field error component for forms
interface FieldErrorProps {
  error?: string;
  className?: string;
}

export const FieldError = memo(({ error, className }: FieldErrorProps) => {
  if (!error) return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1",
      className
    )}>
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
});

// Retry wrapper for async operations
interface RetryWrapperProps {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  children: (retry: () => void) => React.ReactNode;
}

export const RetryWrapper = memo(({
  maxRetries = 3,
  retryDelay = 1000,
  onRetry,
  children
}: RetryWrapperProps) => {
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        onRetry?.(retryCount + 1);
      }, retryDelay);
    }
  };

  return <>{children(handleRetry)}</>;
});

ErrorDisplay.displayName = "ErrorDisplay";
InlineError.displayName = "InlineError";
FieldError.displayName = "FieldError";
RetryWrapper.displayName = "RetryWrapper";