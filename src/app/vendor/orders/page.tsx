'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import tokenManager from '@/utils/tokenManager';
import { 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  User,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/errorUtils';

interface Order {
  id: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cash_on_delivery' | 'bank_transfer' | 'card_payment' | 'mobile_money';
  quantity: number;
  total_amount: number;
  delivery_address: string;
  special_instructions?: string;
  estimated_ready_time?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  meal: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
  };
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  vendor: {
    id: number;
    name: string;
    address: string;
    email: string;
  };
}

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    estimated_ready_time: '',
    notes: '',
    payment_status: 'pending' as string
  });

  useEffect(() => {
    const token = tokenManager.getToken();
    if (!token || tokenManager.isTokenExpired()) {
      router.push('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('http://localhost:8000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        } else {
          toast.error('Failed to load orders');
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const handleOrderAction = async (orderId: number, action: string) => {
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      // Map action to status
      const statusMap: { [key: string]: string } = {
        'accept': 'accepted',
        'reject': 'rejected',
        'preparing': 'preparing',
        'ready': 'ready',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered'
      };

      const newStatus = statusMap[action];
      if (!newStatus) {
        toast.error('Invalid action');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (response.ok) {
        toast.success(`Order ${action}ed successfully`);
        // Refresh orders
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(getErrorMessage(error));
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(`Failed to ${action} order`);
    }
  };

  const handleOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleUpdateOrder = (order: Order) => {
    setSelectedOrder(order);
    setUpdateData({
      estimated_ready_time: order.estimated_ready_time || '',
      notes: order.notes || '',
      payment_status: order.payment_status
    });
    setShowUpdateModal(true);
  };

  const handleMessageCustomer = (order: Order) => {
    // Navigate to messages page with pre-filled message about the order
    const messageData = {
      type: 'inquiry',
      subject: `Order #${order.id} - ${order.meal.name}`,
      content: `Hello ${order.customer.name},\n\nRegarding your order #${order.id} for ${order.meal.name}:\n\n`,
      target_user_id: order.customer.id,
      customer_name: order.customer.name
    };
    
    // Store the message data in localStorage for the messages page to pick up
    localStorage.setItem('prefilledMessage', JSON.stringify(messageData));
    
    // Navigate to the new message page
    router.push('/messages/new');
  };

  const submitOrderUpdate = async () => {
    if (!selectedOrder) return;
    
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimated_ready_time: updateData.estimated_ready_time || null,
          notes: updateData.notes || null,
          payment_status: updateData.payment_status
        }),
      });

      if (response.ok) {
        toast.success('Order updated successfully');
        setShowUpdateModal(false);
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(getErrorMessage(error));
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const getOrderStatistics = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      accepted: orders.filter(o => o.status === 'accepted').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      rejected: orders.filter(o => o.status === 'rejected').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total_amount, 0)
    };
    return stats;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'accepted':
        return 'text-blue-600 bg-blue-100';
      case 'preparing':
        return 'text-orange-600 bg-orange-100';
      case 'ready':
        return 'text-purple-600 bg-purple-100';
      case 'out_for_delivery':
        return 'text-indigo-600 bg-indigo-100';
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'preparing':
        return <Clock className="h-4 w-4" />;
      case 'ready':
        return <Package className="h-4 w-4" />;
      case 'out_for_delivery':
        return <Package className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'refunded':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 {/* Page Header */}
         <div className="mb-8">
           <div>
             <h1 className="text-3xl font-bold text-gray-900 mb-2">
               Orders Management
             </h1>
             <p className="text-lg text-gray-600">
               View and manage all orders for your meals
             </p>
           </div>
         </div>

                 {/* Order Statistics */}
         <div className="mb-6">
           <h3 className="text-lg font-medium text-gray-900 mb-4">Order Statistics</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {(() => {
               const stats = getOrderStatistics();
               return (
                 <>
                   {/* Total Orders Card */}
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-sm font-medium text-gray-600">Total Orders</p>
                         <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                       </div>
                       <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                         <Package className="h-6 w-6 text-blue-600" />
                       </div>
                     </div>
                   </div>

                   {/* Pending Orders Card */}
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                         <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                       </div>
                       <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                         <Clock className="h-6 w-6 text-yellow-600" />
                       </div>
                     </div>
                   </div>

                   {/* Delivered Orders Card */}
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-sm font-medium text-gray-600">Delivered Orders</p>
                         <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
                       </div>
                       <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                         <CheckCircle className="h-6 w-6 text-green-600" />
                       </div>
                     </div>
                   </div>

                   {/* Total Revenue Card */}
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                         <p className="text-3xl font-bold text-green-600">₦{stats.totalRevenue.toLocaleString()}</p>
                       </div>
                       <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                         <DollarSign className="h-6 w-6 text-green-600" />
                       </div>
                     </div>
                   </div>
                 </>
               );
             })()}
           </div>

           {/* Detailed Statistics Row */}
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
             {(() => {
               const stats = getOrderStatistics();
               return (
                 <>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                     <div className="text-2xl font-bold text-blue-600">{stats.accepted}</div>
                     <div className="text-sm text-gray-600">Accepted</div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                     <div className="text-2xl font-bold text-orange-600">{stats.preparing}</div>
                     <div className="text-sm text-gray-600">Preparing</div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                     <div className="text-2xl font-bold text-purple-600">{stats.ready}</div>
                     <div className="text-sm text-gray-600">Ready</div>
                   </div>
                                       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-600">{stats.cancelled}</div>
                      <div className="text-sm text-gray-600">Cancelled</div>
                    </div>
                 </>
               );
             })()}
           </div>
         </div>

         {/* Filters */}
         <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Search */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Search Orders
               </label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <input
                   type="text"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Search by meal name, customer name, or order ID"
                   className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
             </div>

             {/* Status Filter */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Filter by Status
               </label>
               <select
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
               >
                 <option value="">All Statuses</option>
                 <option value="pending">Pending</option>
                 <option value="accepted">Accepted</option>
                 <option value="preparing">Preparing</option>
                 <option value="ready">Ready</option>
                 <option value="out_for_delivery">Out for Delivery</option>
                 <option value="delivered">Delivered</option>
                 <option value="cancelled">Cancelled</option>
                 <option value="rejected">Rejected</option>
               </select>
             </div>
           </div>
         </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Orders ({filteredOrders.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600">
                  {orders.length === 0 
                    ? "You don't have any orders yet." 
                    : "No orders match your current filters."}
                </p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Order #{order.id} - {order.meal.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Customer: {order.customer?.name || 'Unknown'} • {order.customer?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()} at{' '}
                          {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Quantity: {order.quantity} • Total: ₦{order.total_amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Payment: <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                            {order.payment_status}
                          </span> • {order.payment_method.replace('_', ' ')}
                        </p>
                        {order.special_instructions && (
                          <p className="text-sm text-gray-500 mt-1">
                            <strong>Special Instructions:</strong> {order.special_instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleOrderAction(order.id, 'accept')}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleOrderAction(order.id, 'reject')}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {order.status === 'accepted' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'preparing')}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                          >
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'ready')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Ready for Pickup
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'out_for_delivery')}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          >
                            Out for Delivery
                          </button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'delivered')}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>

                                             <div className="flex space-x-2">
                         <button
                           onClick={() => handleOrderDetails(order)}
                           className="text-primary-600 hover:text-primary-700"
                           title="View Details"
                         >
                           <Eye className="h-4 w-4" />
                         </button>
                         <button
                           onClick={() => handleUpdateOrder(order)}
                           className="text-blue-600 hover:text-blue-700"
                           title="Update Order"
                         >
                           <Filter className="h-4 w-4" />
                         </button>
                         <button
                           onClick={() => handleMessageCustomer(order)}
                           className="text-green-600 hover:text-green-700"
                           title="Message Customer"
                         >
                           <MessageSquare className="h-4 w-4" />
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
                 </div>
       </div>

       {/* Order Details Modal */}
       {showOrderModal && selectedOrder && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
               <button
                 onClick={() => setShowOrderModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <h4 className="font-medium text-gray-900">Order Information</h4>
                   <p className="text-sm text-gray-600">Order #{selectedOrder.id}</p>
                   <p className="text-sm text-gray-600">Status: <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                     {selectedOrder.status}
                   </span></p>
                   <p className="text-sm text-gray-600">Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                   {selectedOrder.updated_at && (
                     <p className="text-sm text-gray-600">Updated: {new Date(selectedOrder.updated_at).toLocaleString()}</p>
                   )}
                 </div>
                 
                 <div>
                   <h4 className="font-medium text-gray-900">Payment Information</h4>
                   <p className="text-sm text-gray-600">Status: <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                     {selectedOrder.payment_status}
                   </span></p>
                   <p className="text-sm text-gray-600">Method: {selectedOrder.payment_method.replace('_', ' ')}</p>
                   <p className="text-sm text-gray-600">Total: ₦{selectedOrder.total_amount.toLocaleString()}</p>
                 </div>
               </div>
               
               <div>
                 <h4 className="font-medium text-gray-900">Customer Information</h4>
                 <p className="text-sm text-gray-600">Name: {selectedOrder.customer?.name}</p>
                 <p className="text-sm text-gray-600">Email: {selectedOrder.customer?.email}</p>
                 {selectedOrder.customer?.phone && (
                   <p className="text-sm text-gray-600">Phone: {selectedOrder.customer.phone}</p>
                 )}
                 <p className="text-sm text-gray-600">Address: {selectedOrder.delivery_address}</p>
               </div>
               
               <div>
                 <h4 className="font-medium text-gray-900">Meal Information</h4>
                 <p className="text-sm text-gray-600">Name: {selectedOrder.meal?.name}</p>
                 <p className="text-sm text-gray-600">Price: ₦{selectedOrder.meal?.price?.toLocaleString()}</p>
                 <p className="text-sm text-gray-600">Quantity: {selectedOrder.quantity}</p>
               </div>
               
               {selectedOrder.special_instructions && (
                 <div>
                   <h4 className="font-medium text-gray-900">Special Instructions</h4>
                   <p className="text-sm text-gray-600">{selectedOrder.special_instructions}</p>
                 </div>
               )}
               
               {selectedOrder.estimated_ready_time && (
                 <div>
                   <h4 className="font-medium text-gray-900">Estimated Ready Time</h4>
                   <p className="text-sm text-gray-600">{new Date(selectedOrder.estimated_ready_time).toLocaleString()}</p>
                 </div>
               )}
               
               {selectedOrder.notes && (
                 <div>
                   <h4 className="font-medium text-gray-900">Notes</h4>
                   <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

       {/* Update Order Modal */}
       {showUpdateModal && selectedOrder && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-medium text-gray-900">Update Order #{selectedOrder.id}</h3>
               <button
                 onClick={() => setShowUpdateModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Estimated Ready Time
                 </label>
                 <input
                   type="datetime-local"
                   value={updateData.estimated_ready_time}
                   onChange={(e) => setUpdateData({...updateData, estimated_ready_time: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Payment Status
                 </label>
                 <select
                   value={updateData.payment_status}
                   onChange={(e) => setUpdateData({...updateData, payment_status: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="pending">Pending</option>
                   <option value="paid">Paid</option>
                   <option value="failed">Failed</option>
                   <option value="refunded">Refunded</option>
                 </select>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Notes
                 </label>
                 <textarea
                   value={updateData.notes}
                   onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                   rows={3}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                   placeholder="Add any notes about this order..."
                 />
               </div>
               
               <div className="flex space-x-3">
                 <button
                   onClick={submitOrderUpdate}
                   className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                 >
                   Update Order
                 </button>
                 <button
                   onClick={() => setShowUpdateModal(false)}
                   className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
