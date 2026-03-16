'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Edit, 
  Save, 
  X,
  ChefHat,
  Star,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VendorProfile {
  id: number;
  name: string;
  email: string;
  address: string;
  phone: string;
  description: string;
  approved_status: boolean;
  created_at: string;
  total_meals: number;
  average_rating: number;
  total_orders: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
}

export default function VendorProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    description: '',
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchVendorProfile = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('http://localhost:8000/api/vendors/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
          setFormData({
            name: profileData.name || '',
            email: profileData.email || '',
            address: profileData.address || '',
            phone: profileData.phone || '',
            description: profileData.description || '',
            bank_name: profileData.bank_name || '',
            account_number: profileData.account_number || '',
            account_name: profileData.account_name || ''
          });
        } else if (response.status === 404) {
          // Profile doesn't exist yet, show creation form
          setProfile(null);
          setIsCreating(true);
          // Get user info to pre-fill form
          const userResponse = await fetch('http://localhost:8000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setFormData({
              name: userData.name || '',
              email: userData.email || '',
              address: 'Kano, Nigeria',
              phone: userData.phone || '',
              description: `Vendor profile for ${userData.name}`,
              bank_name: '',
              account_number: '',
              account_name: ''
            });
          }
        } else {
          toast.error('Failed to load profile');
        }
      } catch (error) {
        console.error('Error fetching vendor profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorProfile();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/vendors/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setIsEditing(false);
        toast.success('Profile updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile?.name || '',
        email: profile?.email || '',
        address: profile?.address || '',
        phone: profile?.phone || '',
        description: profile?.description || '',
        bank_name: profile?.bank_name || '',
        account_number: profile?.account_number || '',
        account_name: profile?.account_name || ''
      });
    }
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreateProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Get current user ID
      const userResponse = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!userResponse.ok) {
        toast.error('Failed to get user information');
        return;
      }
      
      const userData = await userResponse.json();
      
      const response = await fetch('http://localhost:8000/api/vendors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData.id,
          description: formData.description,
          address: formData.address
        }),
      });

      if (response.ok) {
        const newProfile = await response.json();
        setProfile(newProfile);
        setIsCreating(false);
        toast.success('Vendor profile created successfully! Please wait for admin approval.');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile && !isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Link href="/vendor" className="text-primary-600 hover:text-primary-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isCreating ? 'Create Vendor Profile' : 'Vendor Profile'}
              </h1>
              <p className="text-lg text-gray-600">
                {isCreating 
                  ? 'Set up your business information to start selling on Tastio'
                  : 'Manage your business information and settings'
                }
              </p>
            </div>
            {!isEditing && !isCreating && profile && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h2>
              
              <div className="space-y-6">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  {(isEditing || isCreating) ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.email}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.address}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.phone || 'Not provided'}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description
                  </label>
                  {isEditing ? (
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.description || 'No description provided'}</p>
                  )}
                </div>

                {/* Bank Details */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
                  <div className="space-y-4">
                    {/* Bank Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="bank_name"
                          value={formData.bank_name}
                          onChange={handleInputChange}
                          placeholder="e.g., First Bank, GT Bank"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.bank_name || 'Not provided'}</p>
                      )}
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="account_number"
                          value={formData.account_number}
                          onChange={handleInputChange}
                          placeholder="10-digit account number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.account_number || 'Not provided'}</p>
                      )}
                    </div>

                    {/* Account Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="account_name"
                          value={formData.account_name}
                          onChange={handleInputChange}
                          placeholder="Name on bank account"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.account_name || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {(isEditing || isCreating) && (
                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={isCreating ? handleCreateProfile : handleSave}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isCreating ? 'Create Profile' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            {profile && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Approval Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile?.approved_status 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {profile?.approved_status ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Member Since</span>
                    <span className="text-sm text-gray-900">
                      {new Date(profile?.created_at || '').toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Creation Info */}
            {isCreating && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Getting Started</h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <p>Welcome to Tastio! To start selling your delicious meals:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Complete your business profile below</li>
                    <li>Wait for admin approval (usually within 24 hours)</li>
                    <li>Start adding your meals to the menu</li>
                    <li>Begin receiving orders from customers</li>
                  </ol>
                  <p className="mt-4 text-xs">
                    <strong>Note:</strong> You'll be able to add meals and receive orders once your profile is approved.
                  </p>
                </div>
              </div>
            )}

            {/* Stats Card */}
            {profile && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <ChefHat className="h-5 w-5 text-primary-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Active Meals</p>
                      <p className="text-lg font-semibold text-gray-900">{profile?.total_meals}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Average Rating</p>
                      <p className="text-lg font-semibold text-gray-900">{profile?.average_rating?.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-lg font-semibold text-gray-900">{profile?.total_orders}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
                            {profile?.approved_status && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/vendor/meals/add"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <ChefHat className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Add New Meal</span>
                  </Link>
                  <Link
                    href="/vendor/orders"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Calendar className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">View Orders</span>
                  </Link>
                  <Link
                    href="/vendor"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <User className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">Dashboard</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
