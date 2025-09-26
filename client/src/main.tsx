import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handlers - suppress development environment noise
window.addEventListener('unhandledrejection', (event) => {
  // Check if it's a Vite/WebSocket related error
  const reason = event.reason;
  
  // Handle console warning filtering for React/Dialog components
  if (reason && typeof reason === 'string' && (
      reason.includes('DialogContent') || 
      reason.includes('DialogTitle') ||
      reason.includes('aria-describedby'))) {
    event.preventDefault();
    return;
  }
  
  if (reason && typeof reason === 'object') {
    // Handle Vite WebSocket connection errors silently
    if (reason.message && reason.message.includes('did not match the expected pattern')) {
      // Completely suppress Vite WebSocket pattern matching errors
      event.preventDefault();
      return;
    }
    
    // Handle WebSocket/HMR related errors  
    if (reason.stack && 
        (reason.stack.includes('eruda.js') || 
         reason.stack.includes('@vite/client') ||
         reason.stack.includes('setupWebSocket'))) {
      // Completely suppress these development tool errors
      event.preventDefault();
      return;
    }
    
    // Handle DOMException errors from Eruda devtools
    if (reason instanceof DOMException || 
        (reason.name === 'DOMException') ||
        (reason.constructor && reason.constructor.name === 'DOMException')) {
      // Completely suppress DOMException errors from devtools
      event.preventDefault();
      return;
    }

    // Handle API fetch errors gracefully
    if (reason.message && (
        reason.message.includes('fetch') || 
        reason.message.includes('Failed to fetch') ||
        reason.message.includes('NetworkError'))) {
      console.warn('Network request failed (will retry):', reason.message);
      event.preventDefault();
      return;
    }

    // Handle Supabase auth errors silently (they're handled in components)
    if (reason.message && (
        reason.message.includes('Auth') ||
        reason.message.includes('supabase') ||
        reason.message.includes('session'))) {
      console.warn('Auth operation failed (handled gracefully):', reason.message);
      event.preventDefault();
      return;
    }

    // Handle empty/undefined rejection objects
    if (!reason.message && !reason.stack && Object.keys(reason).length === 0) {
      console.warn('Empty promise rejection (likely cleanup operation)');
      event.preventDefault();
      return;
    }
  }
  
  // Only log actual unhandled errors
  console.error('🚨 Unhandled promise rejection:', event.reason);
  
  // In development, show more details
  if (import.meta.env.DEV) {
    console.error('Promise rejection details:', {
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
  }
  
  // Prevent the default unhandled rejection behavior
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  // Filter out Vite/development tool related errors
  if (event.error && event.error.stack && 
      (event.error.stack.includes('eruda.js') || 
       event.error.stack.includes('@vite/client'))) {
    console.warn('Development tools error (non-critical):', event.error.message);
    event.preventDefault();
    return;
  }
  
  console.error('Global error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
