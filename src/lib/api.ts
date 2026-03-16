// API client with automatic token refresh and error handling

const API_BASE_URL = 'http://localhost:8000/api';

// Global API client with automatic token refresh
class ApiClient {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.failedQueue = [];
  }

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('token');
    
    // Add authorization header if token exists
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, options);
      
      // If token is expired, try to refresh
      if (response.status === 401 && token) {
        if (this.isRefreshing) {
          // Wait for the refresh to complete
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then(() => this.request(url, options));
        }

        this.isRefreshing = true;

        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('token', data.access_token);
            
            // Update expiration time
            const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
            localStorage.setItem('tokenExpiresAt', expiresAt.toString());
            
            this.processQueue(null, data.access_token);
            
            // Retry the original request with new token
            const newOptions = {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${data.access_token}`,
              },
            };
            
            return fetch(url, newOptions);
          } else {
            // Refresh failed, clear token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('tokenExpiresAt');
            localStorage.removeItem('user');
            this.processQueue(new Error('Token refresh failed'));
            
            // Redirect to login if not already there
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            
            throw new Error('Authentication failed');
          }
        } catch (error) {
          this.processQueue(error);
          throw error;
        } finally {
          this.isRefreshing = false;
        }
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}

export interface Vendor {
  id: number;
  user_id: number;
  description: string;
  address: string;
  approved_status: boolean;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Meal {
  id: number;
  vendor_id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  availability: boolean;
  created_at: string;
  vendor: {
    id: number;
    name: string;
    address: string;
    email: string;
  };
}

export interface Order {
  id: number;
  user_id: number;
  meal_id: number;
  vendor_id: number;
  quantity: number;
  total_amount: number;
  delivery_address: string;
  special_instructions?: string;
  status: 'pending' | 'accepted' | 'ready' | 'delivered' | 'cancelled';
  created_at: string;
  meal: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
  };
  vendor: {
    id: number;
    name: string;
    address: string;
    email: string;
  };
}

export interface Review {
  id: number;
  order_id: number;
  user_id: number;
  vendor_id: number;
  meal_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  },

  async register(name: string, email: string, phone: string, password: string, role: 'customer' | 'vendor' = 'customer') {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, phone, password, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  },
};

// Vendors API
export const vendorsAPI = {
  async getVendors(skip = 0, limit = 100, approvedOnly = true) {
    const response = await apiClient.request(
      `${API_BASE_URL}/vendors?skip=${skip}&limit=${limit}&approved_only=${approvedOnly.toString()}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch vendors');
    }

    return response.json();
  },

  async getVendor(id: number) {
    const response = await apiClient.request(`${API_BASE_URL}/vendors/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch vendor');
    }

    return response.json();
  },

  async createVendor(token: string, vendorData: any) {
    const response = await apiClient.request(`${API_BASE_URL}/vendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vendorData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create vendor');
    }

    return response.json();
  },

  async updateVendor(id: number, vendorData: any) {
    const response = await apiClient.request(`${API_BASE_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vendorData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update vendor');
    }

    return response.json();
  },

  async approveVendor(id: number) {
    const response = await apiClient.request(`${API_BASE_URL}/vendors/${id}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to approve vendor');
    }

    return response.json();
  },

  async rejectVendor(id: number) {
    const response = await apiClient.request(`${API_BASE_URL}/vendors/${id}/reject`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to reject vendor');
    }

    return response.json();
  },
};

// Meals API
export const mealsAPI = {
  async getMeals(vendorId?: number) {
    let url = `${API_BASE_URL}/meals`;
    if (vendorId) {
      url += `?vendor_id=${vendorId}`;
    }

    const response = await apiClient.request(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch meals');
    }

    return response.json();
  },

  async getMeal(id: number) {
    const response = await apiClient.request(`${API_BASE_URL}/meals/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch meal');
    }

    return response.json();
  },

  async createMeal(mealData: FormData) {
    const response = await apiClient.request(`${API_BASE_URL}/meals`, {
      method: 'POST',
      body: mealData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create meal');
    }

    return response.json();
  },

  async updateMeal(id: number, mealData: FormData) {
    const response = await apiClient.request(`${API_BASE_URL}/meals/${id}`, {
      method: 'PUT',
      body: mealData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update meal');
    }

    return response.json();
  },

  async deleteMeal(id: number) {
    const response = await apiClient.request(`${API_BASE_URL}/meals/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete meal');
    }

    return response.json();
  },
};

// Orders API
export const ordersAPI = {
  async getOrders(statusFilter?: string) {
    let url = `${API_BASE_URL}/orders`;
    if (statusFilter) {
      url += `?status_filter=${statusFilter}`;
    }

    const response = await apiClient.request(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    return response.json();
  },

  async getOrder(id: number) {
    const response = await apiClient.request(`${API_BASE_URL}/orders/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }

    return response.json();
  },

  async createOrder(orderData: {
    meal_id: number;
    quantity: number;
    delivery_address: string;
    special_instructions?: string;
  }) {
    const response = await apiClient.request(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create order');
    }

    return response.json();
  },

  async updateOrderStatus(id: number, status: string) {
    const response = await apiClient.request(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update order status');
    }

    return response.json();
  },
};

// Reviews API
export const reviewsAPI = {
  async getReviews(vendorId?: number) {
    let url = `${API_BASE_URL}/reviews`;
    if (vendorId) {
      url += `?vendor_id=${vendorId}`;
    }

    const response = await apiClient.request(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }

    return response.json();
  },

  async getVendorStats(vendorId: number) {
    const response = await apiClient.request(`${API_BASE_URL}/reviews/vendor/${vendorId}/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch vendor stats');
    }

    return response.json();
  },
};

// Utility functions
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

