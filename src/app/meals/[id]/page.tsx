'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Star, 
  MapPin, 
  Clock, 
  ChefHat, 
  ShoppingCart,
  ArrowLeft,
  Phone,
  Mail,
  Heart,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentModal from '@/components/PaymentModal';


interface Meal {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  availability: boolean;
  vendor: {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    average_rating?: number;
    total_reviews?: number;
    profile_picture?: string;
  };
  category: string;
  preparation_time: number;
  ingredients?: string[];
  allergens?: string[];
  nutritional_info?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export default function MealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mealId = params.id as string;
  
  const [meal, setMeal] = useState<Meal | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchMeal = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/api/meals/${mealId}`);
        
        if (response.ok) {
          const data = await response.json();
          setMeal(data);
        } else {
          toast.error('Failed to load meal details');
          router.push('/meals');
        }
      } catch (error) {
        console.error('Error fetching meal:', error);
        toast.error('Failed to load meal details');
        router.push('/meals');
      } finally {
        setIsLoading(false);
      }
    };

    if (mealId) {
      fetchMeal();
    }
  }, [mealId, router]);

  const handleAddToCart = () => {
    if (!meal) return;
    
    // TODO: Implement add to cart functionality
    toast.success(`${quantity}x ${meal.name} added to cart!`);
  };

  const handleOrderNow = () => {
    if (!meal) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to place an order');
      router.push('/login');
      return;
    }

    setShowPaymentModal(true);
  };

  const handleConfirmOrder = async (
    paymentMethod: 'cash_on_delivery' | 'bank_transfer', 
    modalQuantity: number, 
    paymentProof?: File, 
    transactionReference?: string
  ) => {
    if (!meal) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to place an order');
      router.push('/login');
      return;
    }
    
    try {
      let paymentProofUrl = null;
      
      // Upload payment proof if provided
      if (paymentProof && paymentMethod === 'bank_transfer') {
        const formData = new FormData();
        formData.append('file', paymentProof);
        
        const uploadResponse = await fetch('http://localhost:8000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          paymentProofUrl = uploadResult.url;
        } else {
          toast.error('Failed to upload payment proof');
          return;
        }
      }

      const response = await fetch('http://localhost:8000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          meal_id: meal.id,
          quantity: modalQuantity,
          delivery_address: '123 Main Street, Kano', // TODO: Get from user profile
          special_instructions: specialInstructions,
          payment_method: paymentMethod,
          payment_proof_url: paymentProofUrl,
          transaction_reference: transactionReference
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Order placed successfully! Order #${result.id}`);
        setShowPaymentModal(false);
        router.push('/orders');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    }
  };

  const handleContactVendor = () => {
    if (!meal) return;
    
    // TODO: Implement contact vendor functionality
    toast.success(`Contacting ${meal.vendor.name}...`);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meal details...</p>
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Meal not found</h1>
            <p className="text-gray-600 mb-6">The meal you're looking for doesn't exist.</p>
            <Link href="/meals" className="btn-primary">
              Browse All Meals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/meals" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meals
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Meal Image and Info */}
          <div>
            {/* Meal Image */}
            <div className="mb-6">
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                {meal.image_url ? (
                  <img
                    src={meal.image_url.startsWith('http') ? meal.image_url : `http://localhost:8000${meal.image_url}`}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ChefHat className="h-16 w-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Meal Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    isFavorite 
                      ? 'border-red-300 bg-red-50 text-red-600' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </span>
                </button>
                
                <button className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">
                  ₦{meal.price.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  {meal.preparation_time} min preparation
                </div>
              </div>
            </div>

            {/* Vendor Info */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About the Chef</h3>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {meal.vendor.profile_picture ? (
                    <img
                      src={meal.vendor.profile_picture}
                      alt={meal.vendor.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <ChefHat className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                                 <div className="flex-1">
                   <Link href={`/vendors/${meal.vendor.id}`} className="hover:text-primary-600">
                     <h4 className="font-semibold text-gray-900">{meal.vendor.name}</h4>
                   </Link>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{meal.vendor.address}</span>
                  </div>
                  {meal.vendor.average_rating && (
                    <div className="flex items-center space-x-1 mb-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{meal.vendor.average_rating}</span>
                      <span className="text-sm text-gray-500">
                        ({meal.vendor.total_reviews} reviews)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-4 text-sm">
                    <button
                      onClick={handleContactVendor}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call</span>
                    </button>
                    <a
                      href={`mailto:${meal.vendor.email}`}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            {meal.ingredients && (
              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
                <div className="grid grid-cols-2 gap-2">
                  {meal.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                      <span className="text-gray-700">{ingredient}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergens */}
            {meal.allergens && (
              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Allergens</h3>
                <div className="flex flex-wrap gap-2">
                  {meal.allergens.map((allergen, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutritional Info */}
            {meal.nutritional_info && (
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutritional Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {meal.nutritional_info.calories && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {meal.nutritional_info.calories}
                      </div>
                      <div className="text-sm text-gray-600">Calories</div>
                    </div>
                  )}
                  {meal.nutritional_info.protein && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {meal.nutritional_info.protein}g
                      </div>
                      <div className="text-sm text-gray-600">Protein</div>
                    </div>
                  )}
                  {meal.nutritional_info.carbs && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {meal.nutritional_info.carbs}g
                      </div>
                      <div className="text-sm text-gray-600">Carbs</div>
                    </div>
                  )}
                  {meal.nutritional_info.fat && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {meal.nutritional_info.fat}g
                      </div>
                      <div className="text-sm text-gray-600">Fat</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Section */}
          <div>
            {/* Meal Title and Description */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{meal.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{meal.preparation_time} min</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <ChefHat className="h-4 w-4" />
                    <span>{meal.category}</span>
                  </span>
                </div>
              </div>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                {meal.description}
              </p>

              <div className="text-3xl font-bold text-primary-600">
                ₦{meal.price.toLocaleString()}
              </div>
            </div>

            {/* Order Form */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Your Order</h3>
              
              {/* Quantity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium text-gray-900 min-w-[2rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Special Instructions */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special requests or dietary requirements..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₦{(meal.price * quantity).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleOrderNow}
                  disabled={!meal.availability}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Order Now</span>
                </button>
                
                <button
                  onClick={handleAddToCart}
                  disabled={!meal.availability}
                  className="w-full border border-primary-600 text-primary-600 py-3 px-4 rounded-lg font-medium hover:bg-primary-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>
              </div>

              {!meal.availability && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    This meal is currently unavailable. Please check back later.
                  </p>
                </div>
              )}
            </div>

            {/* Similar Meals */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">You might also like</h3>
              <div className="space-y-3">
                <Link href="/meals/2" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ChefHat className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Suya</h4>
                      <p className="text-sm text-gray-600">₦800</p>
                    </div>
                  </div>
                </Link>
                
                <Link href="/meals/3" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ChefHat className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Egusi Soup</h4>
                      <p className="text-sm text-gray-600">₦1,200</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {meal && showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          meal={meal}
          onConfirmOrder={handleConfirmOrder}
        />
      )}
    </div>
  );
}
