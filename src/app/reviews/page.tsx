'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Star, User, Calendar, ThumbsUp, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';


interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  vendor: {
    id: number;
    name: string;
  };
  meal: {
    id: number;
    name: string;
  };
  order: {
    id: number;
  };
}

interface VendorStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    [key: number]: number;
  };
}

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get('vendor_id');
  const mealId = searchParams.get('meal_id');
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        let url = 'http://localhost:8000/api/reviews';
        const params = new URLSearchParams();
        
        if (vendorId) {
          params.append('vendor_id', vendorId);
        }
        if (mealId) {
          params.append('meal_id', mealId);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
        } else {
          toast.error('Failed to load reviews');
        }

        // Fetch vendor stats if vendor_id is provided
        if (vendorId) {
          const statsResponse = await fetch(`http://localhost:8000/api/reviews/vendor/${vendorId}/stats`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setVendorStats(statsData);
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        toast.error('Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [vendorId, mealId]);

  const filteredReviews = filterRating 
    ? reviews.filter(review => review.rating === filterRating)
    : reviews;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Customer Reviews
          </h1>
          <p className="text-lg text-gray-600">
            {vendorId ? 'Reviews for this vendor' : mealId ? 'Reviews for this meal' : 'All reviews'}
          </p>
        </div>

        {/* Vendor Stats */}
        {vendorStats && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor Statistics</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {vendorStats.average_rating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(Math.round(vendorStats.average_rating))}
                </div>
                <p className="text-sm text-gray-600">Average Rating</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {vendorStats.total_reviews}
                </div>
                <p className="text-sm text-gray-600">Total Reviews</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {Math.round((vendorStats.rating_distribution[5] || 0) / vendorStats.total_reviews * 100)}%
                </div>
                <p className="text-sm text-gray-600">5-Star Reviews</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterRating(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterRating === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Reviews
            </button>
            {[5, 4, 3, 2, 1].map(rating => (
              <button
                key={rating}
                onClick={() => setFilterRating(rating)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 ${
                  filterRating === rating
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Star className="h-4 w-4" />
                <span>{rating}+ Stars</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600">
                {filterRating 
                  ? `No ${filterRating}-star reviews available.`
                  : 'No reviews available for this selection.'
                }
              </p>
            </div>
          ) : (
            filteredReviews.map(review => (
              <div key={review.id} className="bg-white rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{review.user.name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {renderStars(review.rating)}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700">{review.comment}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Order #{review.order.id}</span>
                    <Link 
                      href={`/meals/${review.meal.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {review.meal.name}
                    </Link>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ThumbsUp className="h-4 w-4" />
                    <span>Helpful</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link 
            href={vendorId ? `/vendors/${vendorId}` : mealId ? `/meals/${mealId}` : '/vendors'}
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            ← Back to {vendorId ? 'Vendor' : mealId ? 'Meal' : 'Vendors'}
          </Link>
        </div>
      </div>
    </div>
  );
}
