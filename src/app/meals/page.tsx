'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, 
  MapPin, 
  Star, 
  Plus,
  Edit,
  Eye,
  Package,
  ShoppingBag,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import tokenManager from '@/utils/tokenManager';
import { getErrorMessage } from '@/utils/errorUtils';

import { mealsAPI, Meal } from '../../lib/api';
import PaymentModal from '@/components/PaymentModal';
import MealCard from '@/components/MealCard';

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  useEffect(() => {
    const checkUserAndFetchMeals = async () => {
      try {
        setIsLoading(true);
        
        // Get current user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setIsVendor(user.role === 'vendor');
        }
        
        // Fetch meals based on user role
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'vendor') {
            // For vendors, fetch only their meals using the vendor endpoint
            const token = tokenManager.getToken();
            if (token) {
              try {
                const response = await fetch('http://localhost:8000/api/meals/vendor/my-meals', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                if (response.ok) {
                  const vendorMeals = await response.json();
                  setMeals(vendorMeals);
                  setFilteredMeals(vendorMeals);
                } else {
                  // Fallback to regular meals endpoint
                  const response = await mealsAPI.getMeals();
                  setMeals(response.meals);
                  setFilteredMeals(response.meals);
                }

                // Fetch vendor stats
                try {
                  const statsResponse = await fetch('http://localhost:8000/api/vendors/stats', {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                  if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setVendorStats(statsData);
                  }
                } catch (error) {
                  console.log('Failed to fetch vendor stats');
                }
              } catch (error) {
                // Fallback to regular meals endpoint
                const response = await mealsAPI.getMeals();
                setMeals(response.meals);
                setFilteredMeals(response.meals);
              }
            }
          } else {
            // For customers, fetch all available meals
            const response = await mealsAPI.getMeals();
            setMeals(response.meals);
            setFilteredMeals(response.meals);
          }
        } else {
          // No user logged in, fetch all available meals
          const response = await mealsAPI.getMeals();
          setMeals(response.meals);
          setFilteredMeals(response.meals);
        }
      } catch (error) {
        console.error('Error fetching meals:', error);
        toast.error('Failed to load meals');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndFetchMeals();
  }, []);

  useEffect(() => {
    let filtered = meals.filter(meal =>
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredMeals(filtered);
  }, [searchQuery, meals]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  const handleOrderNow = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowPaymentModal(true);
  };

  const handleConfirmOrder = async (
    paymentMethod: 'cash_on_delivery' | 'bank_transfer', 
    quantity: number, 
    paymentProof?: File, 
    transactionReference?: string
  ) => {
    if (!selectedMeal || !currentUser) {
      toast.error('Please log in to place an order');
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
            'Authorization': `Bearer ${tokenManager.getToken()}`,
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

      const orderData = {
        meal_id: selectedMeal.id,
        quantity: quantity,
        delivery_address: 'Customer address will be collected during checkout', // This should be collected from user profile or form
        special_instructions: '',
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl,
        transaction_reference: transactionReference
      };

      const response = await fetch('http://localhost:8000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        toast.success('Order placed successfully!');
        // Refresh meals to update availability if needed
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const toggleAvailability = async (mealId: number, newAvailability: boolean) => {
    try {
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Find the current meal data
      const currentMeal = meals.find(meal => meal.id === mealId);
      if (!currentMeal) {
        toast.error('Meal not found');
        return;
      }

      // Create FormData with all required fields
      const formData = new FormData();
      formData.append('name', currentMeal.name);
      formData.append('description', currentMeal.description);
      formData.append('price', currentMeal.price.toString());
      formData.append('availability', newAvailability.toString());

      const response = await fetch(`http://localhost:8000/api/meals/${mealId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        // Update the meal in the local state
        setMeals(prevMeals => 
          prevMeals.map(meal => 
            meal.id === mealId 
              ? { ...meal, availability: newAvailability }
              : meal
          )
        );
        setFilteredMeals(prevMeals => 
          prevMeals.map(meal => 
            meal.id === mealId 
              ? { ...meal, availability: newAvailability }
              : meal
          )
        );
        toast.success(`Meal ${newAvailability ? 'made available' : 'made unavailable'}`);
      } else {
        const error = await response.json();
        toast.error(getErrorMessage(error));
      }
    } catch (error) {
      console.error('Error updating meal availability:', error);
      toast.error('Failed to update meal availability');
    }
  };

  // Remove category filter since API meals don't have categories

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {isVendor ? 'My Meals' : 'Discover Delicious Meals'}
              </h1>
              <p className="text-lg text-gray-600">
                {isVendor 
                  ? 'Manage your meal offerings and availability'
                  : 'Explore amazing homemade meals from local chefs in your area'
                }
              </p>
            </div>
            {isVendor && (
              <Link
                href="/meals/add"
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add New Meal</span>
              </Link>
            )}
          </div>
        </div>

        {/* Vendor Statistics - Only for vendors */}
        {isVendor && vendorStats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-600">Total Meals</p>
                  <p className="text-2xl font-bold text-green-900">{vendorStats.total_meals || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <ShoppingBag className="h-6 w-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900">{vendorStats.total_orders || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Star className="h-6 w-6 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-900">{vendorStats.average_rating?.toFixed(1) || '0.0'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-2xl mb-6">
            <div className="flex bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search meals, vendors, or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </form>

          {/* Category Filter - Removed since API meals don't have categories */}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredMeals.length} meal{filteredMeals.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Meals Grid */}
        {filteredMeals.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No meals found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or check back later for new meals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeals.map((meal) => (
              isVendor ? (
                <div key={meal.id} className="card-hover">
                  {/* Meal Image */}
                  <div className="aspect-w-16 aspect-h-9 mb-4">
                    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      {meal.image_url ? (
                        <img
                          src={meal.image_url.startsWith('http') ? meal.image_url : `http://localhost:8000${meal.image_url}`}
                          alt={meal.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ChefHat className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Meal Info */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{meal.name}</h3>
                      <span className="font-bold text-primary-600 text-lg">
                        ₦{meal.price.toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {meal.description}
                    </p>

                    {/* Vendor Info */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{meal.vendor.address}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-600">by</span>
                        <Link href={`/vendors/${meal.vendor.id}`} className="font-medium text-gray-900 hover:text-primary-600">
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
                  </div>

                  {/* Action Button */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Link
                        href={`/meals/${meal.id}/edit`}
                        className="flex-1 btn-secondary text-center"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/meals/${meal.id}/vendor`}
                        className="flex-1 btn-primary text-center"
                      >
                        View Details
                      </Link>
                    </div>
                    <button
                      onClick={() => toggleAvailability(meal.id, !meal.availability)}
                      className={`w-full text-sm py-2 px-3 rounded-md font-medium transition-colors ${
                        meal.availability
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {meal.availability ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                  </div>
                </div>
              ) : (
                <MealCard key={meal.id} meal={meal} />
              )
            ))}
          </div>
        )}

        {/* Become a Vendor CTA - Only show for non-vendors */}
        {!isVendor && (
          <div className="mt-12 bg-primary-50 rounded-lg p-8 text-center">
            <ChefHat className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Want to sell your meals?
            </h3>
            <p className="text-gray-600 mb-6">
              Join our community of home chefs and start earning from your cooking skills.
            </p>
            <Link href="/register" className="btn-primary">
              Sign Up as Vendor
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}