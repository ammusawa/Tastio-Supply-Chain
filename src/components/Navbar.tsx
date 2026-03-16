'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  User, 
  ShoppingBag, 
  ChefHat, 
  Package, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import CartIcon from './CartIcon';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
          const response = await fetch('http://localhost:8000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          console.error('Auth check error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
    } else {
      setUser(null);
    }
    setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
    
    // Dispatch auth change event
    window.dispatchEvent(new Event('authChange'));
    
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                Tastio
              </Link>
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              Tastio
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              // Logged in user navigation
              <>
                {user.role === 'customer' && (
              <>
                <Link 
                  href="/vendors" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/vendors') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Browse Vendors
                </Link>
                <Link 
                  href="/meals" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/meals') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  All Meals
                </Link>
                <Link 
                  href="/orders" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/orders') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Cart and Orders
                </Link>
                  </>
                )}
                {user.role === 'vendor' && (
                  <>
                    <Link 
                      href="/vendor" 
                      className={`text-sm font-medium transition-colors ${
                        isActive('/vendor') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      Vendor Dashboard
                    </Link>
                    <Link 
                      href="/vendor/meals" 
                      className={`text-sm font-medium transition-colors ${
                        isActive('/vendor/meals') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      Manage Menu
                    </Link>
                    <Link 
                      href="/vendor/orders" 
                      className={`text-sm font-medium transition-colors ${
                        isActive('/vendor/orders') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      Orders
                    </Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link 
                      href="/admin" 
                      className={`text-sm font-medium transition-colors ${
                        isActive('/admin') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      Admin Panel
                    </Link>
                    <Link 
                      href="/admin/analytics" 
                      className={`text-sm font-medium transition-colors ${
                        isActive('/admin/analytics') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                    >
                      Analytics
                    </Link>
                  </>
                )}
                
                {/* User Menu */}
                <div className="flex items-center space-x-4">
                  <CartIcon />
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              // Guest user navigation
              <>
                <Link 
                  href="/vendors" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/vendors') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Browse Vendors
                </Link>
                <Link 
                  href="/meals" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/meals') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  All Meals
                </Link>
                <Link 
                  href="/login" 
                  className={`text-sm font-medium transition-colors ${
                    isActive('/login') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Login
                </Link>
                <CartIcon />
                <Link 
                  href="/register" 
                  className="btn-primary text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {user ? (
              // Logged in user mobile navigation
              <div className="space-y-4">
                {user.role === 'customer' && (
                  <>
                <Link 
                  href="/vendors" 
                  className={`block text-sm font-medium transition-colors ${
                    isActive('/vendors') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Browse Vendors
                </Link>
                <Link 
                  href="/meals" 
                  className={`block text-sm font-medium transition-colors ${
                    isActive('/meals') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  All Meals
                </Link>
                <Link 
                  href="/orders" 
                  className={`block text-sm font-medium transition-colors ${
                    isActive('/orders') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Cart and Orders
                </Link>
                  </>
                )}
                {user.role === 'vendor' && (
                  <>
                    <Link 
                      href="/vendor" 
                      className={`block text-sm font-medium transition-colors ${
                        isActive('/vendor') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Vendor Dashboard
                    </Link>
                    <Link 
                      href="/vendor/meals" 
                      className={`block text-sm font-medium transition-colors ${
                        isActive('/vendor/meals') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Manage Menu
                    </Link>
                    <Link 
                      href="/vendor/orders" 
                      className={`block text-sm font-medium transition-colors ${
                        isActive('/vendor/orders') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Orders
                    </Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <Link 
                      href="/admin" 
                      className={`block text-sm font-medium transition-colors ${
                        isActive('/admin') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                    <Link 
                      href="/admin/analytics" 
                      className={`block text-sm font-medium transition-colors ${
                        isActive('/admin/analytics') 
                          ? 'text-primary-600' 
                          : 'text-gray-700 hover:text-primary-600'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Analytics
                    </Link>
                  </>
                )}
                
                {/* User info and logout */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </div>
                    <CartIcon />
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              // Guest user mobile navigation
              <div className="space-y-4">
                <Link 
                  href="/vendors" 
                  className={`block text-sm font-medium transition-colors ${
                    isActive('/vendors') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Browse Vendors
                </Link>
                <Link 
                  href="/meals" 
                  className={`block text-sm font-medium transition-colors ${
                    isActive('/meals') 
                      ? 'text-primary-600' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  All Meals
                </Link>
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Cart</span>
                    <CartIcon />
                  </div>
                  <Link 
                    href="/login" 
                    className={`block text-sm font-medium transition-colors ${
                      isActive('/login') 
                        ? 'text-primary-600' 
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/register" 
                    className="btn-primary text-sm block text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
