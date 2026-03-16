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
  Search,
  Filter,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';


interface Vendor {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  profile_picture?: string;
  average_rating?: number;
  total_reviews?: number;
  total_meals: number;
  is_verified: boolean;
  joined_date: string;
}

interface Meal {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  availability: boolean;
  category: string;
  preparation_time: number;
  is_featured?: boolean;
}

export default function VendorStorePage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch vendor details
        const vendorResponse = await fetch(`http://localhost:8000/api/vendors/${vendorId}`);
        if (vendorResponse.ok) {
          const vendorData = await vendorResponse.json();
          setVendor(vendorData);
        } else {
          toast.error('Failed to load vendor details');
          router.push('/vendors');
          return;
        }
        
        // Fetch vendor meals
        const mealsResponse = await fetch(`http://localhost:8000/api/meals?vendor_id=${vendorId}&available_only=true`);
        if (mealsResponse.ok) {
          const mealsData = await mealsResponse.json();
          setMeals(mealsData.meals || []);
          setFilteredMeals(mealsData.meals || []);
        } else {
          toast.error('Failed to load vendor meals');
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        toast.error('Failed to load vendor data');
        router.push('/vendors');
      } finally {
        setIsLoading(false);
      }
    };

    if (vendorId) {
      fetchVendorData();
    }
  }, [vendorId, router]);

  useEffect(() => {
    let filtered = meals.filter(meal =>
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(meal => meal.category === selectedCategory);
    }

    setFilteredMeals(filtered);
  }, [searchQuery, selectedCategory, meals]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  const handleContactVendor = () => {
    if (!vendor) return;
    toast.success(`Contacting ${vendor.name}...`);
  };

  const categories = ['all', ...Array.from(new Set(meals.map(meal => meal.category)))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendor store...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendor not found</h1>
            <p className="text-gray-600 mb-6">The vendor you're looking for doesn't exist.</p>
            <Link href="/vendors" className="btn-primary">
              Browse All Vendors
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
            href="/vendors" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vendors
          </Link>
        </div>

        {/* Vendor Header */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Vendor Profile Picture */}
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              {vendor.profile_picture ? (
                <img
                  src={vendor.profile_picture}
                  alt={vendor.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <ChefHat className="h-12 w-12 text-gray-400" />
              )}
            </div>

            {/* Vendor Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
                {vendor.is_verified && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Verified
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{vendor.address}</span>
                </div>
                {vendor.average_rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{vendor.average_rating}</span>
                    <span>({vendor.total_reviews} reviews)</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Package className="h-4 w-4" />
                  <span>{vendor.total_meals} meals</span>
                </div>
              </div>

              <p className="text-gray-700 mb-4 max-w-2xl">
                {vendor.description}
              </p>

              {/* Contact Buttons */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleContactVendor}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>Contact</span>
                </button>
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-2xl mb-6">
            <div className="flex bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search meals in this store..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </form>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredMeals.length} meal{filteredMeals.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Featured Meals */}
        {filteredMeals.filter(meal => meal.is_featured).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Meals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeals
                .filter(meal => meal.is_featured)
                .map((meal) => (
                  <div key={meal.id} className="card-hover relative">
                    {meal.is_featured && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                          Featured
                        </span>
                      </div>
                    )}
                    
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

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {meal.preparation_time} min
                        </span>
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
                    <Link
                      href={`/meals/${meal.id}`}
                      className="w-full btn-primary text-center"
                    >
                      View Details & Order
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* All Meals */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {filteredMeals.filter(meal => !meal.is_featured).length > 0 ? 'All Meals' : 'No meals found'}
          </h2>
          
          {filteredMeals.filter(meal => !meal.is_featured).length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meals found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or check back later for new meals.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeals
                .filter(meal => !meal.is_featured)
                .map((meal) => (
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

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {meal.preparation_time} min
                        </span>
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
                    <Link
                      href={`/meals/${meal.id}`}
                      className="w-full btn-primary text-center"
                    >
                      View Details & Order
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

