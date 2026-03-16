'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { 
  Users, ChefHat, Package, Star, DollarSign, Calendar,
  CheckCircle, XCircle, AlertCircle, ArrowUpRight, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalyticsData {
  users: {
    total_customers: number;
    total_vendors: number;
    total_admins: number;
    recent_users: number;
  };
  orders: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    recent_orders: number;
  };
  revenue: {
    total_revenue: number;
    total_commission: number;
    commission_rate: number;
  };
  vendors: {
    total_vendors: number;
    approved_vendors: number;
    pending_vendors: number;
  };
  meals: {
    total_meals: number;
  };
}

interface TopVendor {
  id: number;
  name: string;
  email: string;
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  commission_earned: number;
}

interface TopCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_date: string | null;
}

interface PendingVendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  description: string;
  address: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const checkAdminStatusAndFetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'admin') {
            toast.error('Access denied. Admin privileges required.');
            router.push('/');
            return;
          }
          
          await Promise.all([
            fetchAnalytics(token),
            fetchTopVendors(token),
            fetchTopCustomers(token),
            fetchPendingVendors(token)
          ]);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatusAndFetchData();
  }, [router]);

  const fetchAnalytics = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/analytics/overview', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchTopVendors = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/analytics/top-vendors?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTopVendors(data.top_vendors);
      }
    } catch (error) {
      console.error('Error fetching top vendors:', error);
    }
  };

  const fetchTopCustomers = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/analytics/top-customers?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTopCustomers(data.top_customers);
      }
    } catch (error) {
      console.error('Error fetching top customers:', error);
    }
  };

  const fetchPendingVendors = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/analytics/pending-vendors', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingVendors(data.pending_vendors);
      }
    } catch (error) {
      console.error('Error fetching pending vendors:', error);
    }
  };

  const handleApproveVendor = async (vendorId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/admin/vendors/${vendorId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Vendor approved successfully');
        fetchPendingVendors(token!);
        fetchAnalytics(token!);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to approve vendor');
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      toast.error('Failed to approve vendor');
    }
  };

  const handleRejectVendor = async (vendorId: number) => {
    if (!confirm('Are you sure you want to reject this vendor?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/admin/vendors/${vendorId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Vendor rejected successfully');
        fetchPendingVendors(token!);
        fetchAnalytics(token!);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to reject vendor');
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      toast.error('Failed to reject vendor');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive analytics and business insights
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vendors'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Top Vendors
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Top Customers
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approvals
            </button>
            <Link
              href="/admin/analytics"
              className="py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Analytics
            </Link>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.users.total_customers}</p>
                    <p className="text-xs text-green-600 flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +{analytics.users.recent_users} this week
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ChefHat className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.vendors.total_vendors}</p>
                    <p className="text-xs text-yellow-600 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {analytics.vendors.pending_vendors} pending
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.orders.total_orders}</p>
                    <p className="text-xs text-green-600 flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      +{analytics.orders.recent_orders} this week
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₦{analytics.revenue.total_revenue.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 flex items-center">
                      <Percent className="h-3 w-3 mr-1" />
                      {analytics.revenue.commission_rate}% commission
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Commission Earnings</h3>
                  <p className="text-blue-100 mb-4">
                    You earn {analytics.revenue.commission_rate}% commission on every order
                  </p>
                  <div className="text-3xl font-bold">
                    ₦{analytics.revenue.total_commission.toLocaleString()}
                  </div>
                  <p className="text-blue-100 text-sm">Total commission earned</p>
                </div>
                <div className="text-right">
                  <div className="text-6xl font-bold opacity-20">₦</div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.orders.completed_orders}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.orders.pending_orders}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Meals</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.meals.total_meals}</p>
                  </div>
                  <ChefHat className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Top Performing Vendors</h2>
              <div className="text-sm text-gray-600">Ranked by revenue and orders</div>
            </div>

            {topVendors.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vendor data yet</h3>
                <p className="text-gray-600">Vendor performance data will appear here once orders are placed.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topVendors.map((vendor, index) => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary-600">
                                    {index + 1}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                                <div className="text-sm text-gray-500">{vendor.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vendor.total_orders}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{vendor.total_revenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="ml-1 text-sm text-gray-900">
                                {vendor.average_rating.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            ₦{vendor.commission_earned.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Top Customers</h2>
              <div className="text-sm text-gray-600">Ranked by total spending and orders</div>
            </div>

            {topCustomers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customer data yet</h3>
                <p className="text-gray-600">Customer performance data will appear here once orders are placed.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Order Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Order
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topCustomers.map((customer, index) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {index + 1}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.email}</div>
                                <div className="text-xs text-gray-400">{customer.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.total_orders}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            ₦{customer.total_spent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{customer.average_order_value.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.last_order_date 
                              ? new Date(customer.last_order_date).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Pending Vendor Approvals</h2>
              <div className="text-sm text-gray-600">{pendingVendors.length} vendors waiting for approval</div>
            </div>

            {pendingVendors.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">No vendors are currently waiting for approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVendors.map((vendor) => (
                  <div key={vendor.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{vendor.name}</h3>
                            <p className="text-sm text-gray-600">{vendor.email}</p>
                            <p className="text-sm text-gray-500">{vendor.phone}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-700">{vendor.description}</p>
                          <p className="text-sm text-gray-500 mt-1">{vendor.address}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            Applied on {new Date(vendor.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveVendor(vendor.id)}
                          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectVendor(vendor.id)}
                          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
