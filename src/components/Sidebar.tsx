'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  User, 
  ShoppingBag, 
  Star, 
  Settings,
  LogOut,
  Package,
  ChefHat,
  Home,
  Users,
  BarChart3,
  Plus,
  Menu,
  X,
  AlertTriangle,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';
import CartIcon from './CartIcon';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const getNavItems = () => {
    if (!user) return [];

    const baseItems = [
      {
        label: 'Home',
        href: '/',
        icon: Home,
        show: true,
        group: 'main'
      },
      {
        label: 'Profile',
        href: '/profile',
        icon: User,
        show: true,
        group: 'main'
      }
    ];

    // Add customer-specific items
    if (user.role === 'customer') {
      baseItems.push(
        {
          label: 'Meals',
          href: '/meals',
          icon: ChefHat,
          show: true,
          group: 'main'
        },
        {
          label: 'Vendors',
          href: '/vendors',
          icon: Users,
          show: true,
          group: 'main'
        },
        {
          label: 'Orders',
          href: '/orders',
          icon: ShoppingBag,
          show: true,
          group: 'main'
        },
        {
          label: 'Messages',
          href: '/messages',
          icon: MessageSquare,
          show: true,
          group: 'main'
        }
      );
    }

    // Vendor-specific items
    if (user.role === 'vendor') {
      baseItems.push(
        {
          label: 'Dashboard',
          href: '/vendor',
          icon: Star,
          show: true,
          group: 'vendor'
        },
        {
          label: 'My Meals',
          href: '/meals',
          icon: ChefHat,
          show: true,
          group: 'vendor'
        },
        {
          label: 'Orders',
          href: '/vendor/orders',
          icon: Package,
          show: true,
          group: 'vendor'
        },
        {
          label: 'Payments',
          href: '/vendor/payments',
          icon: CreditCard,
          show: true,
          group: 'vendor'
        },
        {
          label: 'Add Meal',
          href: '/vendor/meals/add',
          icon: Plus,
          show: true,
          group: 'vendor'
        },
        {
          label: 'Messages',
          href: '/messages',
          icon: MessageSquare,
          show: true,
          group: 'vendor'
        }
      );
    }

    // Admin-specific items
    if (user.role === 'admin') {
      baseItems.push(
        {
          label: 'Dashboard',
          href: '/admin',
          icon: BarChart3,
          show: true,
          group: 'admin'
        },
        {
          label: 'Users',
          href: '/admin/users',
          icon: Users,
          show: true,
          group: 'admin'
        },
        {
          label: 'Analytics',
          href: '/admin/analytics',
          icon: BarChart3,
          show: true,
          group: 'admin'
        },
        {
          label: 'Messages',
          href: '/messages',
          icon: MessageSquare,
          show: true,
          group: 'admin'
        }
      );
    }

    // Common items
    baseItems.push(
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        show: true,
        group: 'settings'
      }
    );

    return baseItems;
  };

  const navItems = getNavItems();

  const renderNavGroup = (items: any[], groupName: string) => {
    const groupItems = items.filter(item => item.group === groupName);
    if (groupItems.length === 0) return null;

    return (
      <div key={groupName} className="space-y-0.5">
        {groupItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-200 font-medium ${
              isActive(item.href)
                ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className={`h-5 w-5 flex-shrink-0 ${
              isActive(item.href) ? 'text-primary-600' : 'text-gray-500'
            }`} />
            <span className="text-sm whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  };

  const sidebarContent = (
    <div className="w-56 bg-white shadow-lg border-r border-gray-200 min-h-screen fixed left-0 top-0 z-40 overflow-y-auto">
      {/* App Name */}
      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary-700">Tastio</h1>
            <p className="text-xs text-primary-600 font-medium">
              {user?.role === 'admin' ? 'Admin' : 
               user?.role === 'vendor' ? 'Vendor' : 
               user?.role === 'customer' ? 'Customer' : 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <CartIcon />
            <NotificationBell />
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="p-3">
        <nav className="space-y-2">
          {/* Main Navigation */}
          {renderNavGroup(navItems, 'main')}
          
          {/* Vendor Navigation */}
          {user?.role === 'vendor' && (
            <>
              <div className="pt-1">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Vendor Tools
                </h3>
              </div>
              {renderNavGroup(navItems, 'vendor')}
            </>
          )}
          
          {/* Admin Navigation */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-1">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin Tools
                </h3>
              </div>
              {renderNavGroup(navItems, 'admin')}
            </>
          )}
          
          {/* Settings */}
          <div className="pt-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Account
            </h3>
          </div>
          {renderNavGroup(navItems, 'settings')}

          {/* Logout */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`lg:block ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        {sidebarContent}
      </div>

      {/* Main content margin for desktop */}
      <div className="hidden lg:block w-56" />

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
                  <p className="text-sm text-gray-600">Are you sure you want to logout?</p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleLogoutCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
