'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  ChefHat,
  Edit
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'admin';
  created_at: string;
}

interface VendorProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  approved_status: boolean;
  created_at: string;
  total_meals: number;
  average_rating: number;
  total_orders: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  profile_picture?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorProfileStatus, setVendorProfileStatus] = useState<'loading' | 'exists' | 'missing' | 'error'>('loading');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        const userResponse = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);

          // Fetch vendor-specific data
          if (userData.role === 'vendor') {
            try {
              // Get vendor profile
              const profileResponse = await fetch('http://localhost:8000/api/vendors/profile', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setVendorProfile(profileData);
                setVendorProfileStatus('exists');
              } else if (profileResponse.status === 404) {
                setVendorProfileStatus('missing');
              } else {
                setVendorProfileStatus('error');
                console.error('Profile response error:', profileResponse.status, await profileResponse.text());
              }
            } catch (error) {
              console.error('Error fetching vendor data:', error);
              setVendorProfileStatus('error');
            }
          }
        } else {
          toast.error('Failed to load user profile');
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.push('/');
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user.role === 'vendor' ? 'Profile' : 'Dashboard'}
              </h1>
              <p className="text-lg text-gray-600">
                {user.role === 'vendor' 
                  ? 'Manage your vendor profile and business information'
                  : `Welcome back, ${user.name}!`
                }
              </p>
            </div>
            {user.role === 'vendor' && (
              <Link
                href="/profile/edit"
                className="btn-primary flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Link>
            )}
          </div>
        </div>

        {/* Vendor Profile Completion Section */}
        {user.role === 'vendor' && vendorProfileStatus === 'missing' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <ChefHat className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-yellow-900 mb-2">
                  Complete Your Vendor Profile
                </h3>
                <p className="text-yellow-800 mb-4">
                  To start selling meals, you need to complete your vendor profile with business information.
                </p>
                <Link
                  href="/profile/edit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-900 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Profile Content */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                  {user.role === 'vendor' && vendorProfile?.profile_picture ? (
                    <img
                      src={`http://localhost:8000${vendorProfile.profile_picture}`}
                      alt={`${user.name}'s profile`}
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className={`h-8 w-8 text-primary-600 ${user.role === 'vendor' && vendorProfile?.profile_picture ? 'hidden' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{user.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{user.phone}</span>
                  </div>
                </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900 capitalize">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Profile Status */}
        {user.role === 'vendor' && vendorProfileStatus === 'exists' && vendorProfile && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ChefHat className="h-6 w-6 mr-2" />
              Vendor Profile
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{vendorProfile.description || 'No description provided'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{vendorProfile.address || 'No address provided'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {vendorProfile.profile_picture ? (
                    <div className="flex items-center space-x-3">
                      <img
                        src={`http://localhost:8000${vendorProfile.profile_picture}`}
                        alt="Profile picture"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-sm text-gray-600">Profile picture uploaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-500">No profile picture</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  {vendorProfile.approved_status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className={`font-medium ${
                    vendorProfile.approved_status ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {vendorProfile.approved_status ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>
            </div>

            {!vendorProfile.approved_status && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Your vendor profile is under review. You will be notified once approved and can then start creating meals.
                </p>
              </div>
            )}

            {/* Bank Details Section */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{vendorProfile.bank_name || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 font-mono">{vendorProfile.account_number || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{vendorProfile.account_name || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              {(!vendorProfile.bank_name || !vendorProfile.account_number || !vendorProfile.account_name) && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Add your bank details to receive payments from customers. 
                    <Link href="/profile/edit" className="text-yellow-900 underline ml-1">
                      Edit Profile
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
