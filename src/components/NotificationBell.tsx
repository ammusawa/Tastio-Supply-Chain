'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Handle navigation based on notification type
    if (typeof notification.id === 'string') {
      if (notification.id.startsWith('pending_vendors_')) {
        router.push('/admin/users?tab=vendors');
      } else if (notification.id.startsWith('unread_messages_')) {
        router.push('/messages');
      } else if (notification.id.startsWith('pending_orders_')) {
        router.push('/vendor/orders');
      }
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
      case 'order_update':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'payment':
        return '💰';
      case 'system':
        return '🔧';
      case 'promotion':
        return '🎉';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isOpen 
            ? 'bg-primary-100 text-primary-700' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

             {isOpen && (
         <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 transform -translate-x-1/2">
                       <div className="p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900">Notifications</h3>
               <button
                 onClick={() => setIsOpen(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors p-1"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
           </div>
           
                       <div className="max-h-40 overflow-y-auto">
                           {notifications.length === 0 ? (
                <div className="p-3 text-center text-gray-500">
                  <Bell className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                  <p className="text-xs font-medium">No notifications</p>
                  <p className="text-xs text-gray-400">You're all caught up!</p>
                </div>
             ) : (
               <div className="divide-y divide-gray-100">
                                   {notifications.slice(0, 3).map((notification) => (
                                       <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                      }`}
                    >
                     <div className="flex items-start space-x-2">
                       <span className="text-sm flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-medium text-gray-900 truncate">
                           {notification.title}
                         </p>
                         <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                           {notification.message}
                         </p>
                         <p className="text-xs text-gray-400 mt-1">
                           {new Date(notification.created_at).toLocaleDateString('en-US', {
                             month: 'short',
                             day: 'numeric',
                             hour: '2-digit',
                             minute: '2-digit'
                           })}
                         </p>
                       </div>
                       {!notification.read && (
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                       )}
                     </div>
                   </div>
                 ))}
                                   {notifications.length > 3 && (
                    <div className="p-2 text-center">
                      <p className="text-xs text-gray-500">
                        +{notifications.length - 3} more notifications
                      </p>
                    </div>
                  )}
               </div>
             )}
           </div>
           
                       {notifications.length > 0 && (
              <div className="p-1.5 border-t border-gray-200 bg-gray-50 rounded-b-lg">
               <button
                 onClick={() => {
                   markAllAsRead();
                   setIsOpen(false);
                 }}
                 className="w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
               >
                 Mark all as read
               </button>
             </div>
           )}
         </div>
       )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
