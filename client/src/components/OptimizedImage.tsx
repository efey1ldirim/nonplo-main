import React, { useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: React.ReactNode;
}

/**
 * Optimized image component with lazy loading and error fallback
 */
const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  fallbackSrc, 
  loading = 'lazy',
  placeholder 
}: OptimizedImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  if (imageError && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={cn(className)}
        loading={loading}
      />
    );
  }

  return (
    <div className="relative">
      {!imageLoaded && placeholder && (
        <div className={cn("absolute inset-0 flex items-center justify-center", className)}>
          {placeholder}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          className,
          !imageLoaded && placeholder ? 'opacity-0' : 'opacity-100',
          'transition-opacity duration-300'
        )}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;