// Token management utility for automatic refresh and activity tracking

interface TokenData {
  token: string;
  expiresAt: number;
}

class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private lastActivityTime = 0;

  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Set token in localStorage with expiration
  setToken(token: string): void {
    localStorage.setItem('token', token);
    
    // Calculate expiration time (8 hours from now, matching backend)
    const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());
    
    console.log('Token set, expires at:', new Date(expiresAt).toLocaleString());
    
    // Start refresh timer
    this.startRefreshTimer();
  }

  // Remove token from localStorage
  removeToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');
    this.stopRefreshTimer();
    this.stopActivityTimer();
    console.log('Token removed');
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return true;
    
    const expired = Date.now() > parseInt(expiresAt);
    if (expired) {
      console.log('Token is expired');
    }
    return expired;
  }

  // Check if token will expire soon (within 15 minutes)
  isTokenExpiringSoon(): boolean {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return true;
    
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes
    const expiringSoon = Date.now() > (parseInt(expiresAt) - fifteenMinutes);
    if (expiringSoon) {
      console.log('Token expiring soon');
    }
    return expiringSoon;
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('Token refresh already in progress');
      return false;
    }
    
    const token = this.getToken();
    if (!token) {
      console.log('No token to refresh');
      return false;
    }

    try {
      this.isRefreshing = true;
      console.log('Attempting token refresh...');
      
      const response = await fetch('http://localhost:8000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.access_token);
        console.log('Token refreshed successfully');
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('Token refresh failed:', response.status, errorData);
        // Token is invalid, remove it
        this.removeToken();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.removeToken();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Start refresh timer
  startRefreshTimer(): void {
    this.stopRefreshTimer();
    
    // Check every 10 minutes if token needs refresh
    this.refreshTimer = setInterval(() => {
      if (this.isTokenExpiringSoon() && !this.isTokenExpired()) {
        console.log('Token expiring soon, attempting refresh');
        this.refreshToken();
      }
    }, 10 * 60 * 1000); // Check every 10 minutes
    
    console.log('Refresh timer started');
  }

  // Stop refresh timer
  stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('Refresh timer stopped');
    }
  }

  // Start activity timer (refresh token on user activity)
  startActivityTimer(): void {
    this.stopActivityTimer();
    
    // Refresh token every 60 minutes of activity (less aggressive)
    this.activityTimer = setInterval(() => {
      if (!this.isTokenExpired()) {
        console.log('Activity-based token refresh');
        this.refreshToken();
      }
    }, 60 * 60 * 1000); // 60 minutes
    
    console.log('Activity timer started');
  }

  // Stop activity timer
  stopActivityTimer(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
      console.log('Activity timer stopped');
    }
  }

  // Track user activity and refresh token
  trackActivity(): void {
    const now = Date.now();
    
    // Only track activity if it's been at least 10 minutes since last activity
    // This prevents too frequent refresh attempts
    if (now - this.lastActivityTime < 10 * 60 * 1000) {
      return;
    }
    
    this.lastActivityTime = now;
    
    // Start activity timer if not already running
    if (!this.activityTimer) {
      this.startActivityTimer();
    }
    
    // Reset activity timer
    this.stopActivityTimer();
    this.startActivityTimer();
  }

  // Initialize token manager
  init(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired()) {
      console.log('Initializing token manager');
      this.startRefreshTimer();
      this.startActivityTimer();
    } else if (token && this.isTokenExpired()) {
      console.log('Token expired, removing');
      this.removeToken();
    } else {
      console.log('No valid token found');
    }
  }

  // Force refresh token (for manual refresh)
  async forceRefresh(): Promise<boolean> {
    return await this.refreshToken();
  }

  // Get token status for debugging
  getTokenStatus(): { hasToken: boolean; isExpired: boolean; expiresAt: string | null } {
    const token = this.getToken();
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    return {
      hasToken: !!token,
      isExpired: this.isTokenExpired(),
      expiresAt: expiresAt ? new Date(parseInt(expiresAt)).toLocaleString() : null
    };
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

// Initialize on page load
if (typeof window !== 'undefined') {
  tokenManager.init();
  
  // Track user activity (less frequent events)
  const activityEvents = ['click', 'keypress', 'scroll'];
  activityEvents.forEach(event => {
    document.addEventListener(event, () => {
      tokenManager.trackActivity();
    }, { passive: true });
  });
}

export default tokenManager;
