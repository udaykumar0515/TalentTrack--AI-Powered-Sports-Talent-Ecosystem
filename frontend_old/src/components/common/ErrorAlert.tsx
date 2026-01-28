import React from 'react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  onRetry,
  onDismiss,
  type = 'error'
}) => {
  const styles = {
    error: 'bg-red-500/10 border-red-500 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500 text-blue-400'
  };

  const icons = {
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️'
  };

  return (
    <div className={`${styles[type]} border-l-4 p-4 rounded-r-lg flex items-start gap-3`}>
      <span className="text-2xl flex-shrink-0">{icons[type]}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
