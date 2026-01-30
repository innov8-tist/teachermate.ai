import { Alert } from 'react-native';

export interface NetworkRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: FormData | string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  showRetryLogs?: boolean;
}

export interface NetworkError extends Error {
  code?: string;
  status?: number;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isServerError?: boolean;
}

class NetworkService {
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 2;
  private defaultRetryDelay = 1000; // 1 second

  private async checkNetworkConnection(): Promise<boolean> {
    // For now, always return true since NetInfo is causing issues
    // In a production app, you might want to implement a simple fetch test
    // to a reliable endpoint to check connectivity
    return true;
  }

  private createNetworkError(message: string, originalError?: any): NetworkError {
    const error = new Error(message) as NetworkError;
    
    if (originalError) {
      // Detect error types
      if (originalError.name === 'AbortError' || originalError.code === 'ECONNABORTED') {
        error.isTimeoutError = true;
        error.code = 'TIMEOUT';
      } else if (originalError.message === 'Network request failed' || originalError.code === 'NETWORK_ERROR') {
        error.isNetworkError = true;
        error.code = 'NETWORK_ERROR';
      } else if (originalError.status >= 500) {
        error.isServerError = true;
        error.status = originalError.status;
        error.code = 'SERVER_ERROR';
      }
    }

    return error;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateFormData(formData: FormData): void {
    // Basic FormData validation
    try {
      // Try to iterate through FormData to check if it's valid
      let entryCount = 0;
      const entries: [string, any][] = [];
      
      // Use for...of loop which is supported in React Native
      for (const [key, value] of formData as any) {
        entries.push([key, value]);
        entryCount++;
      }
      
      if (entryCount === 0) {
        throw new Error('FormData is empty');
      }
      
      // Log FormData contents for debugging
      console.log('📋 FormData validation passed. Entries:', entryCount);
      entries.forEach(([key, value]) => {
        if (typeof value === 'object' && value && 'uri' in value) {
          console.log(`  - ${key}: [File] ${(value as any).name || 'unnamed'}`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      });
    } catch (error) {
      throw new Error('Invalid FormData structure');
    }
  }

  async request(url: string, options: NetworkRequestOptions = {}): Promise<Response> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      showRetryLogs = true
    } = options;

    // Validate FormData if present
    if (body instanceof FormData) {
      this.validateFormData(body);
    }

    // Check network connection
    const isConnected = await this.checkNetworkConnection();
    if (!isConnected) {
      throw this.createNetworkError('No internet connection. Please check your network and try again.');
    }

    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          if (showRetryLogs) {
            console.log(`🔄 Network retry attempt ${attempt}/${retries} for ${method} ${url}`);
          }
          await this.delay(retryDelay * attempt); // Exponential backoff
        } else {
          console.log(`📡 Network request: ${method} ${url}`);
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Log response details
        console.log(`📥 Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.clone().json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            // Ignore JSON parsing errors for error responses
          }
          
          const error = this.createNetworkError(errorMessage);
          error.status = response.status;
          
          // Don't retry client errors (4xx), only server errors (5xx) and network issues
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          lastError = error;
          continue; // Retry for server errors
        }

        console.log(`✅ Request successful after ${attempt + 1} attempt(s)`);
        return response;

      } catch (error: any) {
        lastError = error;
        
        // Handle different error types
        if (error.name === 'AbortError') {
          const timeoutError = this.createNetworkError(
            `Request timeout after ${timeout}ms. Please try again.`,
            error
          );
          
          // Don't retry timeout errors on the last attempt
          if (attempt === retries) {
            throw timeoutError;
          }
          
          if (showRetryLogs) {
            console.log(`⏱️ Request timeout, retrying...`);
          }
          continue;
        }
        
        // Network errors - retry
        if (error.message === 'Network request failed' || error.code === 'NETWORK_ERROR') {
          const networkError = this.createNetworkError(
            'Network connection failed. Please check your internet connection.',
            error
          );
          
          if (attempt === retries) {
            throw networkError;
          }
          
          if (showRetryLogs) {
            console.log(`🌐 Network error, retrying...`);
          }
          continue;
        }
        
        // For other errors, don't retry
        throw this.createNetworkError(error.message || 'Request failed', error);
      }
    }

    // If we get here, all retries failed
    throw lastError || this.createNetworkError('All retry attempts failed');
  }

  // Convenience methods
  async get(url: string, options: Omit<NetworkRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url: string, body?: FormData | string, options: Omit<NetworkRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'POST', body });
  }

  async put(url: string, body?: FormData | string, options: Omit<NetworkRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  async delete(url: string, options: Omit<NetworkRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // Helper for JSON responses
  async requestJson<T = any>(url: string, options: NetworkRequestOptions = {}): Promise<T> {
    const response = await this.request(url, options);
    return response.json();
  }

  // Helper for form submissions with better error handling
  async submitForm<T = any>(url: string, formData: FormData, options: Omit<NetworkRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const response = await this.post(url, formData, {
      timeout: 60000, // 60 seconds for file uploads
      retries: 2,
      showRetryLogs: true,
      ...options
    });
    return response.json();
  }
}

export const networkService = new NetworkService();