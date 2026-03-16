'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChefHat, MapPin, Plus, Minus } from 'lucide-react';
import { Meal } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

interface MealCardProps {
  meal: Meal;
  showAddToCart?: boolean;
}

export default function MealCard({ meal, showAddToCart = true }: MealCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const currentQuantity = getItemQuantity(meal.id);

  const handleAddToCart = () => {
    addItem(meal, quantity);
    toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart!`);
    setQuantity(1);
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Meal Image */}
      <div className="aspect-w-16 aspect-h-9">
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          {meal.image_url ? (
            <img
              src={meal.image_url.startsWith('http') ? meal.image_url : `http://localhost:8000${meal.image_url}`}
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ChefHat className="h-12 w-12 text-gray-400" />
          )}
        </div>
      </div>

      {/* Meal Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{meal.name}</h3>
          <span className="font-bold text-primary-600 text-lg ml-2">
            ₦{meal.price.toLocaleString()}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {meal.description}
        </p>

        {/* Vendor Info */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{meal.vendor.address}</span>
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center space-x-1">
            <span className="text-gray-600">by</span>
            <Link 
              href={`/vendors/${meal.vendor.id}`} 
              className="font-medium text-gray-900 hover:text-primary-600"
            >
              {meal.vendor.name}
            </Link>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            meal.availability 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {meal.availability ? 'Available' : 'Unavailable'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {showAddToCart && meal.availability ? (
            <>
              {currentQuantity === 0 ? (
                // Meal not in cart - show Add to Cart and View Details
                <>
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </button>

                  {/* View Details Button */}
                  <Link
                    href={`/meals/${meal.id}`}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center block"
                  >
                    View Details
                  </Link>
                </>
              ) : (
                // Meal already in cart - show Remove and View Details
                <>
                  <div className="text-center mb-3">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      {currentQuantity} in cart
                    </span>
                  </div>

                  {/* Remove from Cart Button */}
                  <button
                    onClick={() => removeItem(meal.id)}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Minus className="h-4 w-4" />
                    <span>Remove from Cart</span>
                  </button>

                  {/* View Details Button */}
                  <Link
                    href={`/meals/${meal.id}`}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center block"
                  >
                    View Details
                  </Link>
                </>
              )}
            </>
          ) : (
            // Meal not available - only show View Details
            <Link
              href={`/meals/${meal.id}`}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center block"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
