'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, Phone, Mail, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import MealCard from '../components/MealCard';
import { mealsAPI, Meal } from '../lib/api';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setIsLoading(true);
        const response = await mealsAPI.getMeals();
        const availableMeals = response.meals.filter((meal: Meal) => meal.availability);
        setMeals(availableMeals);
        setFilteredMeals(availableMeals);
      } catch (error) {
        console.error('Error fetching meals:', error);
        toast.error('Failed to load meals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeals();
  }, []);

  useEffect(() => {
    const filtered = meals.filter(meal =>
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

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Delicious Homemade Food
              <br />
              <span className="text-primary-200">Delivered to You</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Discover amazing home-cooked meals from local vendors in Kano
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="flex-1 flex items-center px-4">
                  <Search className="h-5 w-5 text-gray-400 mr-3" />
                  <input
                    type="text"
                    placeholder="Search for meals, vendors, or cuisines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 px-8 py-3 text-white font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Browse Meals Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Browse Delicious Meals
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Discover amazing homemade meals from local chefs. Add to cart and order when ready!
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
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
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading delicious meals...</p>
            </div>
          ) : filteredMeals.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meals found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search terms.' : 'Check back later for new meals.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeals.slice(0, 6).map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )}

          {filteredMeals.length > 6 && (
            <div className="text-center mt-8">
              <Link
                href="/meals"
                className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                View All Meals
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Tastio?
            </h2>
            <p className="text-lg text-gray-600">
              Connect with local home chefs and enjoy authentic homemade meals
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Assured</h3>
              <p className="text-gray-600">
                All vendors are verified and rated by our community
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Local & Fresh</h3>
              <p className="text-gray-600">
                Fresh ingredients and local flavors from your neighborhood
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Ordering</h3>
              <p className="text-gray-600">
                Simple and secure ordering process
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Ordering?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Browse meals, add to cart, and order when you're ready. No account needed to start shopping!
          </p>
          <div className="space-x-4">
            <Link
              href="/meals"
              className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Browse All Meals
            </Link>
            <Link
              href="/register"
              className="inline-block bg-primary-700 text-white px-8 py-3 rounded-lg font-medium border border-white hover:bg-primary-800 transition-colors"
            >
              Sign Up for Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
