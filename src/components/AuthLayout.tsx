'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import toast from 'react-hot-toast';
import tokenManager from '@/utils/tokenManager';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Pages that don't require authentication
  const publicPages = ['/', '/login', '/register'];

  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getToken();
      
      if (!token) {
        // No token, check if we're on a public page
        if (!publicPages.includes(pathname)) {
          router.push('/login');
        }
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (tokenManager.isTokenExpired()) {
        console.log('Token expired, attempting refresh');
        const refreshed = await tokenManager.refreshToken();
        if (!refreshed) {
          // Refresh failed, remove token and redirect
          tokenManager.removeToken();
          localStorage.removeItem('user');
          if (!publicPages.includes(pathname)) {
            router.push('/login');
          }
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else if (response.status === 401) {
          // Token is invalid, try to refresh
          console.log('Token invalid, attempting refresh');
          const refreshed = await tokenManager.refreshToken();
          if (!refreshed) {
            // Refresh failed, remove token and redirect
            tokenManager.removeToken();
            localStorage.removeItem('user');
            if (!publicPages.includes(pathname)) {
              router.push('/login');
            }
          } else {
            // Token refreshed, retry the auth check
            const newToken = tokenManager.getToken();
            if (newToken) {
              const retryResponse = await fetch('http://localhost:8000/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                },
              });
              if (retryResponse.ok) {
                const userData = await retryResponse.json();
                setUser(userData);
              } else {
                // Still failed, redirect to login
                tokenManager.removeToken();
                localStorage.removeItem('user');
                if (!publicPages.includes(pathname)) {
                  router.push('/login');
                }
              }
            }
          }
        } else {
          // Other error, try to refresh token
          console.log('API error, attempting token refresh');
          const refreshed = await tokenManager.refreshToken();
          if (!refreshed) {
            tokenManager.removeToken();
            localStorage.removeItem('user');
            if (!publicPages.includes(pathname)) {
              router.push('/login');
            }
          } else {
            // Retry with new token
            const newToken = tokenManager.getToken();
            if (newToken) {
              const retryResponse = await fetch('http://localhost:8000/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                },
              });
              if (retryResponse.ok) {
                const userData = await retryResponse.json();
                setUser(userData);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Network error, try to refresh token
        const refreshed = await tokenManager.refreshToken();
        if (!refreshed) {
          tokenManager.removeToken();
          localStorage.removeItem('user');
          if (!publicPages.includes(pathname)) {
            router.push('/login');
          }
        } else {
          // Retry with new token
          const newToken = tokenManager.getToken();
          if (newToken) {
            try {
              const retryResponse = await fetch('http://localhost:8000/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                },
              });
              if (retryResponse.ok) {
                const userData = await retryResponse.json();
                setUser(userData);
              }
            } catch (retryError) {
              console.error('Retry auth check error:', retryError);
              tokenManager.removeToken();
              localStorage.removeItem('user');
              if (!publicPages.includes(pathname)) {
                router.push('/login');
              }
            }
          }
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = () => {
    tokenManager.removeToken();
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sidebar layout for authenticated users
  if (user && !publicPages.includes(pathname)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="lg:ml-64">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Show regular layout for public pages or unauthenticated users
  return <>{children}</>;
}
