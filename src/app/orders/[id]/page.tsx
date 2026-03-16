'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  Star, 
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  ArrowLeft,
  Phone,
  Mail,
  Truck,
  User,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  meal: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
    description: string;
  };
  vendor: {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    profile_picture?: string;
  };
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  quantity: number;
  total_amount: number;
  delivery_address: string;
  special_instructions?: string;
  created_at: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  rating?: number;
  review?: string;
  status_updates: {
    status: string;
    timestamp: string;
    message: string;
  }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    // TODO: Fetch order details from API using orderId
    // For now, using mock data
    const mockOrder: Order = {
      id: parseInt(orderId),
      meal: {
        id: 1,
        name: 'Jollof Rice',
        price: 1500,
        image_url: '/api/placeholder/300/200',
        description: 'Spicy rice cooked with tomatoes, peppers, and aromatic spices. A Nigerian classic!',
      },
      vendor: {
        id: 1,
        name: 'Mama Aisha',
        address: 'Nasarawa GRA, Kano',
        phone: '+234 801 234 5678',
        email: 'mamaaisha@example.com',
        profile_picture: '/api/placeholder/150/150',
      },
      status: 'preparing',
      quantity: 2,
      total_amount: 3000,
      delivery_address: '123 Main Street, Kano',
      special_instructions: 'Extra spicy please',
      created_at: '2024-01-15T10:30:00Z',
      estimated_delivery: '2024-01-15T11:30:00Z',
      status_updates: [
        {
          status: 'pending',
          timestamp: '2024-01-15T10:30:00Z',
          message: 'Order placed successfully'
        },
        {
          status: 'accepted',
          timestamp: '2024-01-15T10:35:00Z',
          message: 'Order accepted by vendor'
        },
        {
          status: 'preparing',
          timestamp: '2024-01-15T10:45:00Z',
          message: 'Meal is being prepared'
        }
      ]
    };

    setOrder(mockOrder);
    setIsLoading(false);
  }, [orderId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'preparing':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready for Pickup';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleCancelOrder = () => {
    if (!order) return;
    
    // TODO: Implement cancel order API call
    toast.success('Order cancelled successfully');
    setOrder({ ...order, status: 'cancelled' });
  };

  const handleSubmitReview = () => {
    if (!order || rating === 0) return;
    
    // TODO: Implement submit review API call
    toast.success('Review submitted successfully');
    setOrder({ ...order, rating, review });
  };

  const handleReorder = () => {
    if (!order) return;
    
    // TODO: Implement reorder functionality
    toast.success('Redirecting to meal page...');
    router.push(`/meals/${order.meal.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
            <Link href="/orders" className="btn-primary">
              View All Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/orders" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </div>

        {/* Order Header */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleDateString()} at{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>

          {/* Status Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
              {order.estimated_delivery && (
                <div className="text-sm text-gray-600">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Estimated: {new Date(order.estimated_delivery).toLocaleTimeString()}
                </div>
              )}
            </div>
            
            {/* Status Timeline */}
            <div className="space-y-4">
              {order.status_updates.map((update, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(update.status)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{getStatusText(update.status)}</p>
                    <p className="text-sm text-gray-600">{update.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(update.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Meal and Vendor Info */}
          <div className="space-y-6">
            {/* Meal Details */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Details</h3>
              <div className="flex items-start space-x-4">
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  {order.meal.image_url ? (
                    <img
                      src={order.meal.image_url.startsWith('http') ? order.meal.image_url : `http://localhost:8000${order.meal.image_url}`}
                      alt={order.meal.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{order.meal.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">{order.meal.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantity: {order.quantity}</span>
                    <span className="font-semibold text-primary-600">
                      ₦{order.meal.price.toLocaleString()} each
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Details */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {order.vendor.profile_picture ? (
                    <img
                      src={order.vendor.profile_picture}
                      alt={order.vendor.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Link href={`/vendors/${order.vendor.id}`} className="hover:text-primary-600">
                    <h4 className="font-semibold text-gray-900">{order.vendor.name}</h4>
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{order.vendor.address}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <a
                      href={`tel:${order.vendor.phone}`}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`mailto:${order.vendor.email}`}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Delivery Address</p>
                    <p className="text-gray-600">{order.delivery_address}</p>
                  </div>
                </div>
                {order.special_instructions && (
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Special Instructions</p>
                      <p className="text-gray-600">{order.special_instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary and Actions */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Meal Price</span>
                  <span>₦{order.meal.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity</span>
                  <span>{order.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₦{(order.meal.price * order.quantity).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">₦{order.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Actions */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {order.status === 'pending' && (
                  <button
                    onClick={handleCancelOrder}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                
                {order.status === 'delivered' && !order.rating && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate your experience
                      </label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-2xl ${
                              star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Write a review (optional)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleSubmitReview}
                      disabled={rating === 0}
                      className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit Review
                    </button>
                  </div>
                )}

                {order.rating && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="font-medium text-green-800">Thank you for your review!</span>
                    </div>
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= order.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {order.review && (
                      <p className="text-sm text-green-700">{order.review}</p>
                    )}
                  </div>
                )}

                {order.status === 'delivered' && (
                  <button
                    onClick={handleReorder}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Reorder This Meal
                  </button>
                )}

                <Link
                  href={`/meals/${order.meal.id}`}
                  className="w-full border border-primary-600 text-primary-600 py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors text-center block"
                >
                  View Meal Details
                </Link>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-800 text-sm mb-3">
                If you have any questions about your order, contact the vendor directly or reach out to our support team.
              </p>
              <div className="space-y-2">
                <a
                  href={`tel:${order.vendor.phone}`}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call Vendor</span>
                </a>
                <a
                  href={`mailto:${order.vendor.email}`}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Vendor</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

