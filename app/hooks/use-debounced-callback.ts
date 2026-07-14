import { useCallback, useRef } from 'react';

/**
 * Hook to debounce a callback function
 * Prevents rapid successive calls - only executes after delay period of inactivity
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Hook to throttle a callback function
 * Prevents rapid successive calls - only executes once per time period
 * Better for actions that should happen immediately but not too frequently
 * 
 * @param callback - Function to throttle
 * @param delay - Minimum time between calls in milliseconds (default: 1000ms)
 * @returns Throttled version of the callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        // Enough time has passed, execute immediately
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Too soon, schedule for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        const remainingTime = delay - timeSinceLastCall;
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, remainingTime);
      }
    },
    [callback, delay]
  );
}

/**
 * Hook to prevent double-clicks on buttons
 * Disables the button for a short period after first click
 * 
 * @param callback - Function to call on click
 * @param cooldown - Cooldown period in milliseconds (default: 1000ms)
 * @returns Object with onClick handler and isDisabled state
 */
export function usePreventDoubleClick<T extends (...args: any[]) => any>(
  callback: T,
  cooldown: number = 1000
): {
  onClick: (...args: Parameters<T>) => void;
  isDisabled: boolean;
} {
  const isDisabledRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onClick = useCallback(
    (...args: Parameters<T>) => {
      if (isDisabledRef.current) {
        console.log('⚠️ Button click ignored (cooldown active)');
        return;
      }

      // Execute callback
      callback(...args);

      // Disable for cooldown period
      isDisabledRef.current = true;

      // Re-enable after cooldown
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        isDisabledRef.current = false;
      }, cooldown);
    },
    [callback, cooldown]
  );

  return {
    onClick,
    isDisabled: isDisabledRef.current,
  };
}
