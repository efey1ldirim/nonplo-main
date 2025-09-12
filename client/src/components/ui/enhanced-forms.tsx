import { cn } from "@/lib/utils";
import { memo, useState, useEffect } from "react";
import { Check, AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "./enhanced-error-handling";

// Enhanced input with validation states
interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  showPasswordToggle?: boolean;
  onValueChange?: (value: string) => void;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => string | undefined;
  };
}

export const EnhancedInput = memo(({
  label,
  error,
  success,
  hint,
  showPasswordToggle,
  onValueChange,
  validation,
  className,
  type = "text",
  ...props
}: EnhancedInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const [touched, setTouched] = useState(false);

  const inputType = type === "password" && showPassword ? "text" : type;
  const hasError = error || localError;
  const showSuccess = success && !hasError && touched;

  const validateValue = (value: string) => {
    if (!validation || !touched) return;

    if (validation.required && !value.trim()) {
      setLocalError("Bu alan zorunludur");
      return;
    }

    if (validation.minLength && value.length < validation.minLength) {
      setLocalError(`En az ${validation.minLength} karakter olmalıdır`);
      return;
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      setLocalError(`En fazla ${validation.maxLength} karakter olmalıdır`);
      return;
    }

    if (validation.pattern && !validation.pattern.test(value)) {
      setLocalError("Geçersiz format");
      return;
    }

    if (validation.custom) {
      const customError = validation.custom(value);
      if (customError) {
        setLocalError(customError);
        return;
      }
    }

    setLocalError(undefined);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    validateValue(value);
    onValueChange?.(value);
    props.onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    validateValue(e.target.value);
    props.onBlur?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
          {validation?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          {...props}
          type={inputType}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "transition-all duration-200",
            hasError && "border-red-500 focus-visible:ring-red-500",
            showSuccess && "border-green-500 focus-visible:ring-green-500 pr-10",
            type === "password" && showPasswordToggle && "pr-10",
            className
          )}
        />

        {/* Success indicator */}
        {showSuccess && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}

        {/* Password toggle */}
        {type === "password" && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Error message */}
      <FieldError error={hasError} />

      {/* Hint message */}
      {hint && !hasError && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
});

// Enhanced textarea with character count
interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  showCharCount?: boolean;
  maxCharacters?: number;
  onValueChange?: (value: string) => void;
}

export const EnhancedTextarea = memo(({
  label,
  error,
  success,
  hint,
  showCharCount,
  maxCharacters,
  onValueChange,
  className,
  ...props
}: EnhancedTextareaProps) => {
  const [charCount, setCharCount] = useState(0);
  const [touched, setTouched] = useState(false);

  const showSuccess = success && !error && touched;
  const isNearLimit = maxCharacters && charCount > maxCharacters * 0.9;
  const isOverLimit = maxCharacters && charCount > maxCharacters;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCharCount(value.length);
    onValueChange?.(value);
    props.onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTouched(true);
    props.onBlur?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Textarea
          {...props}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "transition-all duration-200",
            error && "border-red-500 focus-visible:ring-red-500",
            showSuccess && "border-green-500 focus-visible:ring-green-500",
            isOverLimit && "border-red-500",
            className
          )}
        />

        {/* Success indicator */}
        {showSuccess && (
          <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <FieldError error={error} />
          
          {hint && !error && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>{hint}</span>
            </div>
          )}
        </div>

        {/* Character count */}
        {showCharCount && (
          <div className={cn(
            "text-xs",
            isOverLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-muted-foreground"
          )}>
            {charCount}{maxCharacters && `/${maxCharacters}`}
          </div>
        )}
      </div>
    </div>
  );
});

// Form section with better organization
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection = memo(({
  title,
  description,
  children,
  className
}: FormSectionProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="space-y-4 pl-4 border-l-2 border-muted">
        {children}
      </div>
    </div>
  );
});

// Auto-save indicator
interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved?: Date;
}

export const AutoSaveIndicator = memo(({
  status,
  lastSaved
}: AutoSaveIndicatorProps) => {
  const statusConfig = {
    idle: { text: "Değişiklikler kaydedilmedi", color: "text-muted-foreground" },
    saving: { text: "Kaydediliyor...", color: "text-blue-500" },
    saved: { text: "Kaydedildi", color: "text-green-500" },
    error: { text: "Kaydetme hatası", color: "text-red-500" }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={cn(
        "h-2 w-2 rounded-full",
        status === "saving" && "bg-blue-500 animate-pulse",
        status === "saved" && "bg-green-500",
        status === "error" && "bg-red-500",
        status === "idle" && "bg-muted-foreground"
      )} />
      
      <span className={statusConfig[status].color}>
        {statusConfig[status].text}
      </span>
      
      {lastSaved && status === "saved" && (
        <span className="text-muted-foreground">
          ({lastSaved.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })})
        </span>
      )}
    </div>
  );
});

EnhancedInput.displayName = "EnhancedInput";
EnhancedTextarea.displayName = "EnhancedTextarea";
FormSection.displayName = "FormSection";
AutoSaveIndicator.displayName = "AutoSaveIndicator";