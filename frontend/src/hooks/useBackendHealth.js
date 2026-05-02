import { useState, useEffect } from 'react';

/**
 * Hook to detect if the backend server is available
 * Returns true when server is healthy, false when warming up or down
 */
export const useBackendHealth = (checkInterval = 2000) => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const checkHealth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE}/`, {
          method: 'GET',
          timeout: 3000,
          signal: AbortSignal.timeout(3000)
        });

        if (isMounted) {
          setIsHealthy(response.ok);
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
          setIsHealthy(false);
          setIsInitialized(true);
        }
      }

      // Schedule next check
      if (isMounted) {
        timeoutId = setTimeout(checkHealth, checkInterval);
      }
    };

    // Initial check
    checkHealth();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkInterval]);

  return { isHealthy, isInitialized };
};
