// Utility function to handle errors silently in development mode
export const handleApiError = (error: any, context: string = 'API') => {
  if (process.env.NODE_ENV === 'development') {
    // In development, log to console but don't show to user
    console.log(`[${context} - Suppressed for Demo]`, error?.message || 'Unknown error');
    return false; // Indicate error was handled silently
  }
  
  // In production, you might want to log to an error tracking service
  console.error(`[${context} Error]`, error);
  return true; // Indicate error was not handled silently
};

// Global error handler for uncaught exceptions
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Global Error - Suppressed for Demo]', message);
      return true; // Prevent default error handling
    }
    return false; // Let default error handling proceed in production
  };
}
