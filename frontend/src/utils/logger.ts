// Development-only logger utility
// Only logs in development mode, silent in production

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      }
  },
  
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      }
  }
};
