import { RotateCcw, AlertTriangle } from 'lucide-react';
import '../styles/FetchErrorState.css';

function FetchErrorState({
  message,
  onRetry,
  retryLabel = 'Try Again',
  className = ''
}) {
  return (
    <div className={`fetch-error-state ${className}`.trim()}>
      <div className="fetch-error-copy">
        <AlertTriangle size={16} aria-hidden="true" />
        <p>{message}</p>
      </div>
      {typeof onRetry === 'function' && (
        <button type="button" className="fetch-error-retry-btn" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden="true" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}

export default FetchErrorState;
