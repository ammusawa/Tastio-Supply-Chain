'use client';

import { useState } from 'react';
import { ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LoginRegisterModal from './LoginRegisterModal';
import { useRouter } from 'next/navigation';

export default function CartIcon() {
  const { state, removeItem, updateQuantity } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();

  const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
  
  // Debug logging
  console.log('CartIcon render - itemCount:', itemCount, 'items:', state.items);

  const handleQuantityChange = (mealId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(mealId);
    } else {
      updateQuantity(mealId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (state.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      setIsCartOpen(false);
      setShowLoginModal(true);
      return;
    }
    
    // Close cart modal and redirect to checkout page
    setIsCartOpen(false);
    router.push('/checkout');
  };

  return (
    <>
      {/* Cart Icon */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors border border-gray-300 rounded"
      >
        <ShoppingBag className="h-6 w-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-900">Your Cart</h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Cart Items - Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {state.items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h4>
                  <p className="text-gray-600 mb-4">Add some delicious meals to get started!</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Browse Meals
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.items.map((item) => (
                    <div key={item.meal.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start space-x-4">
                        {/* Meal Image */}
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
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
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">{item.meal.name}</h4>
                          <p className="text-sm text-gray-600 mb-1">by {item.meal.vendor.name}</p>
                          <p className="text-lg font-bold text-primary-600">₦{item.meal.price.toLocaleString()}</p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.meal.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item.meal.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center text-lg font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.meal.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Subtotal</p>
                          <p className="text-lg font-bold text-gray-900">₦{(item.meal.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Fixed at Bottom */}
            {state.items.length > 0 && (
              <div className="border-t border-gray-200 p-6 flex-shrink-0 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-primary-600">₦{state.total.toLocaleString()}</span>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-lg"
                  >
                    Proceed to Checkout
                  </button>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login/Register Modal */}
      <LoginRegisterModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
}
