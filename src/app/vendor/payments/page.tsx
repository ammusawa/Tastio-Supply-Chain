'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Eye, Download, Clock, DollarSign, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import tokenManager from '@/utils/tokenManager';
import PaymentConfirmationModal from '@/components/PaymentConfirmationModal';

interface PaymentOrder {
  id: number;
  customer_name: string;
  meal_name: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  payment_confirmed_by_vendor: boolean;
  payment_proof_url?: string;
  transaction_reference?: string;
  payment_notes?: string;
  created_at: string;
  payment_confirmed_at?: string;
}

export default function VendorPaymentsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'bank_transfer'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    const token = tokenManager.getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [router]);

  useEffect(() => {
    filterOrders();
  }, [orders, filter]);

  const fetchOrders = async () => {
    try {
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Please log in to view payments');
        return;
      }

      const response = await fetch('http://localhost:8000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter orders that have payment methods requiring confirmation
        const paymentOrders = data.orders.filter((order: PaymentOrder) => 
          order.payment_method === 'bank_transfer' || order.payment_confirmed_by_vendor
        );
        setOrders(paymentOrders);
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    switch (filter) {
      case 'pending':
        filtered = orders.filter(order => 
          !order.payment_confirmed_by_vendor && order.payment_method === 'bank_transfer'
        );
        break;
      case 'confirmed':
        filtered = orders.filter(order => order.payment_confirmed_by_vendor);
        break;
      case 'bank_transfer':
        filtered = orders.filter(order => order.payment_method === 'bank_transfer');
        break;
      default:
        filtered = orders;
    }

    setFilteredOrders(filtered);
  };

  const handleViewPayment = async (order: PaymentOrder) => {
    try {
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Please log in to view payment details');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/orders/${order.id}/payment-details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const paymentDetails = await response.json();
        setSelectedOrder({
          ...order,
          ...paymentDetails
        });
        setShowConfirmationModal(true);
      } else {
        toast.error('Failed to fetch payment details');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error('Failed to fetch payment details');
    }
  };

  const handleConfirmPayment = async (confirmed: boolean, notes: string) => {
    if (!selectedOrder) return;

    try {
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Please log in to confirm payment');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/orders/${selectedOrder.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmed,
          notes,
          message: `Payment ${confirmed ? 'confirmed' : 'rejected'} by vendor`
        }),
      });

      if (response.ok) {
        toast.success(`Payment ${confirmed ? 'confirmed' : 'rejected'} successfully`);
        setShowConfirmationModal(false);
        fetchOrders(); // Refresh the orders list
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment');
    }
  };

  const getStatusColor = (status: string, confirmed: boolean) => {
    if (confirmed) return 'text-green-600 bg-green-100';
    
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (order: PaymentOrder) => {
    if (order.payment_confirmed_by_vendor) {
      return 'Confirmed';
    }
    if (order.payment_method === 'bank_transfer' && order.payment_proof_url) {
      return 'Awaiting Confirmation';
    }
    return order.payment_status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management</h1>
          <p className="text-gray-600">Review and confirm customer payments</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'pending', label: 'Pending Confirmation', icon: Clock },
                { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
                { key: 'bank_transfer', label: 'Bank Transfers', icon: CreditCard },
                { key: 'all', label: 'All Payments', icon: DollarSign },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    filter === key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    filter === key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {key === 'pending' 
                      ? orders.filter(o => !o.payment_confirmed_by_vendor && o.payment_method === 'bank_transfer').length
                      : key === 'confirmed'
                      ? orders.filter(o => o.payment_confirmed_by_vendor).length
                      : key === 'bank_transfer'
                      ? orders.filter(o => o.payment_method === 'bank_transfer').length
                      : orders.length
                    }
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {filter === 'pending' 
                ? 'No payments pending confirmation'
                : `No ${filter} payments at the moment`
              }
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <li key={order.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Order #{order.id} - {order.meal_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Customer: {order.customer_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ₦{order.total_amount.toLocaleString()}
                          </p>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            getStatusColor(order.payment_status, order.payment_confirmed_by_vendor)
                          }`}>
                            {getStatusText(order)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-1" />
                          {order.payment_method.replace('_', ' ').toUpperCase()}
                        </span>
                        {order.transaction_reference && (
                          <span>Ref: {order.transaction_reference}</span>
                        )}
                        <span>
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center space-x-2">
                      {order.payment_proof_url && (
                        <a
                          href={`http://localhost:8000${order.payment_proof_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Proof
                        </a>
                      )}
                      
                      <button
                        onClick={() => handleViewPayment(order)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                      >
                        {order.payment_confirmed_by_vendor ? 'View Details' : 'Review Payment'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {selectedOrder && (
        <PaymentConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          order={selectedOrder}
          onConfirmPayment={handleConfirmPayment}
        />
      )}
    </div>
  );
}
