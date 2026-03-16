// API wrapper with automatic token refresh

import tokenManager from './tokenManager';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl = 'http://localhost:8000/api';

  async request(endpoint: string, options: ApiOptions = {}) {
    const { method = 'GET', headers = {}, body, skipAuth = false } = options;

    // Add auth header if not skipped
    if (!skipAuth) {
      const token = tokenManager.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add content type for requests with body
    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // If token is expired, try to refresh
      if (response.status === 401 && !skipAuth) {
        const refreshed = await tokenManager.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const newToken = tokenManager.getToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...config,
              headers,
            });
            return retryResponse;
          }
        }
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint: string, options: Omit<ApiOptions, 'method'> = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  // POST request
  async post(endpoint: string, body?: any, options: Omit<ApiOptions, 'method' | 'body'> = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  // PUT request
  async put(endpoint: string, body?: any, options: Omit<ApiOptions, 'method' | 'body'> = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  // DELETE request
  async delete(endpoint: string, options: Omit<ApiOptions, 'method'> = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
const api = new ApiClient();

export default api;
