// Google Analytics integration for client-side tracking

// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });

  // Also send to our internal analytics
  trackInternalEvent(action, { category, label, value });
};

// Internal analytics tracking
export const trackInternalEvent = async (event: string, properties: Record<string, any> = {}) => {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        properties
      })
    });
  } catch (error) {
    console.warn('Failed to track internal event:', error);
  }
};

// Track user interactions
export const trackUserInteraction = (interaction: string, element: string, details?: Record<string, any>) => {
  trackEvent('user_interaction', 'ui', `${interaction}_${element}`);
  trackInternalEvent('user_interaction', {
    interaction,
    element,
    ...details
  });
};

// Track feature usage
export const trackFeatureUsage = (feature: string, action: string, details?: Record<string, any>) => {
  trackEvent('feature_usage', feature, action);
  trackInternalEvent('feature_usage', {
    feature,
    action,
    ...details
  });
};

// Track performance metrics
export const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
  trackEvent('performance', metric, unit, value);
  trackInternalEvent('performance_metric', {
    metric,
    value,
    unit
  });
};

// Track business events
export const trackBusinessEvent = (event: string, properties: Record<string, any>) => {
  trackEvent('business', event, JSON.stringify(properties));
  trackInternalEvent('business_event', {
    businessEvent: event,
    ...properties
  });
};