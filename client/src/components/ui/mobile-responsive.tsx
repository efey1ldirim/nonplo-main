import { cn } from "@/lib/utils";
import { memo, useState, useEffect } from "react";
import { Menu, X, ChevronLeft, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mobile navigation drawer
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const MobileDrawer = memo(({
  isOpen,
  onClose,
  children,
  title
}: MobileDrawerProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 max-w-[80vw] bg-background border-r shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-full pb-20">
          {children}
        </div>
      </div>
    </>
  );
});

// Responsive container that adapts to screen size
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
}

export const ResponsiveContainer = memo(({
  children,
  className,
  maxWidth = "xl",
  padding = true
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-7xl",
    "2xl": "max-w-7xl",
    full: "max-w-none"
  };

  return (
    <div className={cn(
      "mx-auto w-full",
      maxWidthClasses[maxWidth],
      padding && "px-4 sm:px-6 lg:px-8",
      className
    )}>
      {children}
    </div>
  );
});

// Mobile-first grid system
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveGrid = memo(({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = 4,
  className
}: ResponsiveGridProps) => {
  const gridClasses = [
    `grid gap-${gap}`,
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  );
});

// Mobile-optimized card stack
interface MobileCardStackProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardStack = memo(({
  children,
  className
}: MobileCardStackProps) => {
  return (
    <div className={cn(
      "space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0",
      className
    )}>
      {children}
    </div>
  );
});

// Touch-friendly action bar
interface TouchActionBarProps {
  actions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "primary" | "destructive";
  }>;
  className?: string;
}

export const TouchActionBar = memo(({
  actions,
  className
}: TouchActionBarProps) => {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-30 md:relative md:border-t-0 md:p-0 md:bg-transparent",
      className
    )}>
      <div className="flex gap-2 max-w-md mx-auto md:max-w-none">
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            variant={action.variant === "primary" ? "default" : action.variant || "outline"}
            className="flex-1 h-12 gap-2 md:h-auto md:flex-initial"
          >
            {action.icon}
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
});

// Swipe gesture handler (simplified)
interface SwipeGestureProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const SwipeGesture = memo(({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  children,
  className
}: SwipeGestureProps) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const threshold = 100;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    setTouchStart(null);
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
});

// Mobile breadcrumb navigation
interface MobileBreadcrumbProps {
  items: Array<{
    label: string;
    onClick?: () => void;
  }>;
  className?: string;
}

export const MobileBreadcrumb = memo(({
  items,
  className
}: MobileBreadcrumbProps) => {
  const currentItem = items[items.length - 1];
  const previousItem = items[items.length - 2];

  return (
    <div className={cn("flex items-center gap-2 py-3", className)}>
      {previousItem && (
        <Button
          variant="ghost"
          size="sm"
          onClick={previousItem.onClick}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-foreground truncate">
          {currentItem.label}
        </h1>
        
        {previousItem && (
          <button
            onClick={previousItem.onClick}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {previousItem.label}
          </button>
        )}
      </div>
    </div>
  );
});

// Scroll to top button
export const ScrollToTop = memo(() => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="sm"
      className={cn(
        "fixed bottom-20 right-4 z-30 h-12 w-12 rounded-full shadow-lg transition-all duration-300 md:bottom-8",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
});

MobileDrawer.displayName = "MobileDrawer";
ResponsiveContainer.displayName = "ResponsiveContainer";
ResponsiveGrid.displayName = "ResponsiveGrid";
MobileCardStack.displayName = "MobileCardStack";
TouchActionBar.displayName = "TouchActionBar";
SwipeGesture.displayName = "SwipeGesture";
MobileBreadcrumb.displayName = "MobileBreadcrumb";
ScrollToTop.displayName = "ScrollToTop";