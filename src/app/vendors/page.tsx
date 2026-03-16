'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Star, MapPin, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';

import { vendorsAPI, Vendor } from '../../lib/api';

interface Meal {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  availability: boolean;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoading(true);
        const response = await vendorsAPI.getVendors(0, 100, true);
        setVendors(response.vendors);
        setFilteredVendors(response.vendors);
      } catch (error) {
        console.error('Error fetching vendors:', error);
        toast.error('Failed to load vendors');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    const filtered = vendors.filter(vendor =>
      vendor.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVendors(filtered);
  }, [searchQuery, vendors]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
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
            Browse Local Vendors
          </h1>
          <p className="text-lg text-gray-600">
            Discover amazing home chefs in your area
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="flex bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Search vendors, meals, or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Vendors Grid */}
        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or check back later for new vendors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => (
              <div key={vendor.id} className="card-hover">
                {/* Vendor Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <ChefHat className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <Link href={`/vendors/${vendor.id}`} className="hover:text-primary-600">
                      <h3 className="font-semibold text-gray-900">{vendor.user.name}</h3>
                    </Link>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span>{vendor.address}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-500">
                        {vendor.approved_status ? '✓ Verified Vendor' : 'Pending Approval'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {vendor.description}
                </p>

                {/* Contact Info */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Contact</h4>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {vendor.user.email}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/vendors/${vendor.id}`}
                  className="w-full btn-primary text-center"
                >
                  View Menu & Order
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Become a Vendor CTA */}
        <div className="mt-12 bg-primary-50 rounded-lg p-8 text-center">
          <ChefHat className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Want to become a vendor?
          </h3>
          <p className="text-gray-600 mb-6">
            Share your delicious homemade meals with the community and earn money from your cooking skills.
          </p>
          <Link href="/register" className="btn-primary">
            Sign Up as Vendor
          </Link>
        </div>
      </div>
    </div>
  );
}
