'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit,
  Calendar,
  Clock,
  Package,
  TrendingUp,
  Eye,
  ChefHat,
  MapPin,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import tokenManager from '@/utils/tokenManager';
import { getImageUrl } from '@/utils/imageUtils';
import { getErrorMessage } from '@/utils/errorUtils';

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
    email: string;
  };
  created_at: string;
  updated_at?: string;
}

interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_rating?: number;
  total_reviews?: number;
}

export default function VendorMealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mealId = params.id as string;
  
  const [meal, setMeal] = useState<Meal | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMealData = async () => {
      try {
        setIsLoading(true);
        const token = tokenManager.getToken();
        
        if (!token) {
          toast.error('Authentication required');
          router.push('/login');
          return;
        }

        // Fetch meal details
        const mealResponse = await fetch(`http://localhost:8000/api/meals/${mealId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (mealResponse.ok) {
          const mealData = await mealResponse.json();
          setMeal(mealData);
          
          // Fetch order statistics for this meal (if available)
          try {
            const statsResponse = await fetch(`http://localhost:8000/api/meals/${mealId}/stats`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              setOrderStats(statsData);
            }
          } catch (error) {
            console.log('Stats not available for this meal');
          }
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
      fetchMealData();
    }
  }, [mealId, router]);

  const toggleAvailability = async (mealId: number, newAvailability: boolean) => {
    try {
      const token = tokenManager.getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Find the current meal data
      const currentMeal = meal;
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
        setMeal(prevMeal => prevMeal ? { ...prevMeal, availability: newAvailability } : null);
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
              Back to Meals
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Meal Image and Basic Info */}
          <div className="lg:col-span-2">
            {/* Meal Image */}
            <div className="mb-6">
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                {meal.image_url ? (
                  <img
                    src={getImageUrl(meal.image_url) || ''}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ChefHat className="h-16 w-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Meal Details */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{meal.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Created {new Date(meal.created_at).toLocaleDateString()}</span>
                    </div>
                    {meal.updated_at && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Updated {new Date(meal.updated_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">
                    ₦{meal.price.toLocaleString()}
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    meal.availability 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {meal.availability ? 'Available' : 'Unavailable'}
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{meal.description}</p>
              </div>
            </div>

            {/* Performance Stats */}
            {orderStats && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Package className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-900">{orderStats.total_orders}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-900">₦{orderStats.total_revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Star className="h-6 w-6 text-yellow-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Average Rating</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {orderStats.average_rating ? orderStats.average_rating.toFixed(1) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions and Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href={`/meals/${meal.id}/edit`}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Meal</span>
                </Link>
                <button
                  onClick={() => toggleAvailability(meal.id, !meal.availability)}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    meal.availability
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {meal.availability ? 'Mark Unavailable' : 'Mark Available'}
                </button>
              </div>
            </div>

            {/* Meal Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    meal.availability 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {meal.availability ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Price</span>
                  <span className="font-semibold">₦{meal.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-sm">{new Date(meal.created_at).toLocaleDateString()}</span>
                </div>
                {meal.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="text-sm">{new Date(meal.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vendor Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChefHat className="h-5 w-5 mr-2" />
                Your Business
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600 text-sm">Business Name</span>
                  <p className="font-medium">{meal.vendor.name}</p>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <span className="text-gray-600 text-sm">{meal.vendor.address}</span>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Contact Email</span>
                  <p className="text-sm">{meal.vendor.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
