import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  // Check if it's a Vite/WebSocket related error
  const reason = event.reason;
  
  if (reason && typeof reason === 'object') {
    // Handle Vite WebSocket connection errors silently
    if (reason.name === 'SyntaxError' && 
        reason.message && 
        reason.message.includes('did not match the expected pattern')) {
      console.warn('Vite WebSocket connection issue (non-critical):', reason.message);
      event.preventDefault();
      return;
    }
    
    // Handle WebSocket/HMR related errors
    if (reason.stack && 
        (reason.stack.includes('eruda.js') || 
         reason.stack.includes('@vite/client') ||
         reason.stack.includes('setupWebSocket'))) {
      console.warn('Development tools WebSocket error (non-critical):', reason.message);
      event.preventDefault();
      return;
    }
  }
  
  console.error('Unhandled promise rejection:', event.reason);
  // Only prevent default for non-critical errors
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
