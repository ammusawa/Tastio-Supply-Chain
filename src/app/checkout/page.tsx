'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { ShoppingBag, MapPin, User, Phone, Mail, Trash2, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import tokenManager from '@/utils/tokenManager';
import LoginRegisterModal from '@/components/LoginRegisterModal';
import CheckoutPaymentModal from '@/components/CheckoutPaymentModal';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export default function CheckoutPage() {
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    // Get user info
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setDeliveryAddress(userData.address || '');
    }

    // Redirect if cart is empty
    if (state.items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/meals');
      return;
    }
  }, [state.items.length, router]);

  const handleQuantityChange = (mealId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(mealId);
    } else {
      updateQuantity(mealId, newQuantity);
    }
  };

    const handlePlaceOrder = () => {
    if (!user || !deliveryAddress.trim()) {
      toast.error('Please provide a delivery address');
      return;
    }

    // Show payment modal instead of directly placing order
    setShowPaymentModal(true);
  };

  const handleConfirmOrder = async (
    paymentMethod: 'cash_on_delivery' | 'bank_transfer',
    paymentProof?: File,
    transactionReference?: string
  ) => {
    setIsLoading(true);

    try {
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Create orders for each meal in cart
      const orderPromises = state.items.map(item => {
        const orderData = {
          meal_id: item.meal.id,
          quantity: item.quantity,
          delivery_address: deliveryAddress,
          special_instructions: specialInstructions,
          payment_method: paymentMethod,
          payment_proof_url: paymentProof ? 'uploaded' : undefined,
          transaction_reference: transactionReference
        };

        return fetch('http://localhost:8000/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(orderData),
        });
      });

      const responses = await Promise.all(orderPromises);
      const failedOrders = responses.filter(response => !response.ok);

      if (failedOrders.length > 0) {
        toast.error('Some orders failed to be placed');
        return;
      }

      toast.success('Orders placed successfully!');
      clearCart();
      router.push('/orders');
    } catch (error) {
      console.error('Error placing orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to place orders';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Add some delicious meals to get started!</p>
          <button
            onClick={() => router.push('/meals')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Meals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Review your order and complete your purchase</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-4">
              {state.items.map((item) => (
                <div key={item.meal.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  {/* Meal Image */}
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {item.meal.image_url ? (
                      <img
                        src={item.meal.image_url.startsWith('http') ? item.meal.image_url : `http://localhost:8000${item.meal.image_url}`}
                        alt={item.meal.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Meal Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.meal.name}</h4>
                    <p className="text-sm text-gray-600">₦{item.meal.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">by {item.meal.vendor.name}</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item.meal.id, item.quantity - 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.meal.id, item.quantity + 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₦{(item.meal.price * item.quantity).toLocaleString()}</p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.meal.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-4 mt-6">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>₦{state.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>
                </div>
                
                {user?.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    id="address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your delivery address"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    id="instructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Any special delivery instructions..."
                  />
                </div>
              </div>
            </div>

            {/* Place Order Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <button
                onClick={handlePlaceOrder}
                disabled={isLoading || !deliveryAddress.trim()}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Placing Order...' : `Place Order - ₦${state.total.toLocaleString()}`}
              </button>
              
              <p className="text-sm text-gray-600 mt-2 text-center">
                You'll be redirected to payment after placing your order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Login/Register Modal */}
      <LoginRegisterModal 
        isOpen={showLoginModal} 
        onClose={() => {
          setShowLoginModal(false);
          // If user closes modal without logging in, redirect to meals page
          if (!localStorage.getItem('token')) {
            router.push('/meals');
          }
        }} 
      />

      {/* Checkout Payment Modal */}
      <CheckoutPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cartItems={state.items}
        totalAmount={state.total}
        deliveryAddress={deliveryAddress}
        specialInstructions={specialInstructions}
        onConfirmOrder={handleConfirmOrder}
      />
    </div>
  );
}
