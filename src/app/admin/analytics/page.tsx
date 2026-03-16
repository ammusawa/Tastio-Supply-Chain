'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

import { 
  Users, ChefHat, Package, Star, DollarSign, Calendar,
  TrendingUp, BarChart3, LineChart, ArrowUpRight, Percent, Download,
  Eye, ShoppingCart, Clock, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

interface RevenueData {
  date: string;
  orders_count: number;
  daily_revenue: number;
  daily_commission: number;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [timeRange, setTimeRange] = useState('30');

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
      const response = await fetch('http://localhost:8000/api/admin/analytics/top-vendors?limit=10', {
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
      const response = await fetch('http://localhost:8000/api/admin/analytics/top-customers?limit=10', {
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

  const fetchRevenueData = useCallback(async (token: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/analytics/revenue-chart?days=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRevenueData(data.revenue_chart);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  }, [timeRange]);

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
            fetchRevenueData(token)
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
  }, [router, fetchRevenueData]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchRevenueData(token);
    }
  }, [fetchRevenueData]);

  // Chart configurations
  const revenueChartData = {
    labels: revenueData.map(item => item.date),
    datasets: [
      {
        label: 'Revenue',
        data: revenueData.map(item => item.daily_revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Commission',
        data: revenueData.map(item => item.daily_commission),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const ordersChartData = {
    labels: revenueData.map(item => item.date),
    datasets: [
      {
        label: 'Orders',
        data: revenueData.map(item => item.orders_count),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      },
    ],
  };

  const orderStatusData = analytics ? {
    labels: ['Completed', 'Pending', 'Cancelled'],
    datasets: [
      {
        data: [
          analytics.orders.completed_orders,
          analytics.orders.pending_orders,
          analytics.orders.total_orders - analytics.orders.completed_orders - analytics.orders.pending_orders
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  const userDistributionData = analytics ? {
    labels: ['Customers', 'Vendors', 'Admins'],
    datasets: [
      {
        data: [
          analytics.users.total_customers,
          analytics.users.total_vendors,
          analytics.users.total_admins
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(147, 51, 234, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(251, 146, 60)',
          'rgb(147, 51, 234)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Comprehensive insights and performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>

        {analytics && (
          <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Revenue Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-sm border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-900">₦{analytics.revenue.total_revenue.toLocaleString()}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-700 font-medium">+12.5% vs last month</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <DollarSign className="h-8 w-8 text-green-700" />
                  </div>
                </div>
              </div>

              {/* Commission Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Commission Earned</p>
                    <p className="text-3xl font-bold text-blue-900">₦{analytics.revenue.total_commission.toLocaleString()}</p>
                    <div className="flex items-center mt-2">
                      <Percent className="h-4 w-4 text-blue-600 mr-1" />
                      <span className="text-sm text-blue-700 font-medium">{analytics.revenue.commission_rate}% commission rate</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <BarChart3 className="h-8 w-8 text-blue-700" />
                  </div>
                </div>
              </div>

              {/* Orders Card */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-purple-900">{analytics.orders.total_orders}</p>
                    <div className="flex items-center mt-2">
                      <ArrowUpRight className="h-4 w-4 text-purple-600 mr-1" />
                      <span className="text-sm text-purple-700 font-medium">+{analytics.orders.recent_orders} this week</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <Package className="h-8 w-8 text-purple-700" />
                  </div>
                </div>
              </div>

              {/* Vendors Card */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-sm border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 mb-1">Active Vendors</p>
                    <p className="text-3xl font-bold text-orange-900">{analytics.vendors.approved_vendors}</p>
                    <div className="flex items-center mt-2">
                      <ChefHat className="h-4 w-4 text-orange-600 mr-1" />
                      <span className="text-sm text-orange-700 font-medium">{analytics.vendors.pending_vendors} pending approval</span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-full">
                    <ChefHat className="h-8 w-8 text-orange-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Trends Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Revenue Trends</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Revenue</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Commission</span>
                    </div>
                  </div>
                </div>
                
                {revenueData.length > 0 ? (
                  <div className="h-80">
                    <Line data={revenueChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No revenue data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Orders Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Daily Orders</h2>
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
                
                {revenueData.length > 0 ? (
                  <div className="h-80">
                    <Bar data={ordersChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No order data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Order Status Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Order Status Distribution</h2>
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                
                {orderStatusData ? (
                  <div className="h-64">
                    <Doughnut data={orderStatusData} options={doughnutOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No order data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* User Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">User Distribution</h2>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                
                {userDistributionData ? (
                  <div className="h-64">
                    <Doughnut data={userDistributionData} options={doughnutOptions} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No user data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Performers Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Vendors */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Top Performing Vendors</h2>
                  <Link href="/admin" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View All
                  </Link>
                </div>
                
                {topVendors.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No vendor data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topVendors.slice(0, 5).map((vendor, index) => (
                      <div key={vendor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-100' : 
                            index === 1 ? 'bg-gray-100' : 
                            index === 2 ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              index === 0 ? 'text-yellow-600' : 
                              index === 1 ? 'text-gray-600' : 
                              index === 2 ? 'text-orange-600' : 'text-blue-600'
                            }`}>{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{vendor.name}</p>
                            <p className="text-sm text-gray-500">{vendor.total_orders} orders • ⭐ {vendor.average_rating.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₦{vendor.total_revenue.toLocaleString()}</p>
                          <p className="text-sm text-green-600">₦{vendor.commission_earned.toLocaleString()} commission</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Customers */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Top Customers</h2>
                  <Link href="/admin" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View All
                  </Link>
                </div>
                
                {topCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No customer data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topCustomers.slice(0, 5).map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-100' : 
                            index === 1 ? 'bg-gray-100' : 
                            index === 2 ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              index === 0 ? 'text-yellow-600' : 
                              index === 1 ? 'text-gray-600' : 
                              index === 2 ? 'text-orange-600' : 'text-blue-600'
                            }`}>{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.total_orders} orders • Last: {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₦{customer.total_spent.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">₦{customer.average_order_value.toLocaleString()} avg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* User Growth */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">User Growth</h3>
                  <Users className="h-6 w-6 text-blue-700" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Customers</span>
                    <span className="font-bold text-blue-900 text-lg">{analytics.users.total_customers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Vendors</span>
                    <span className="font-bold text-blue-900 text-lg">{analytics.users.total_vendors}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">New This Week</span>
                    <span className="font-bold text-green-600 text-lg">+{analytics.users.recent_users}</span>
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-900">Order Status</h3>
                  <Package className="h-6 w-6 text-purple-700" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700 font-medium">Completed</span>
                    <span className="font-bold text-green-600 text-lg">{analytics.orders.completed_orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700 font-medium">Pending</span>
                    <span className="font-bold text-yellow-600 text-lg">{analytics.orders.pending_orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700 font-medium">Total</span>
                    <span className="font-bold text-purple-900 text-lg">{analytics.orders.total_orders}</span>
                  </div>
                </div>
              </div>

              {/* Platform Stats */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-sm border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-orange-900">Platform Stats</h3>
                  <BarChart3 className="h-6 w-6 text-orange-700" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700 font-medium">Total Meals</span>
                    <span className="font-bold text-orange-900 text-lg">{analytics.meals.total_meals}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700 font-medium">Approved Vendors</span>
                    <span className="font-bold text-green-600 text-lg">{analytics.vendors.approved_vendors}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700 font-medium">Pending Vendors</span>
                    <span className="font-bold text-yellow-600 text-lg">{analytics.vendors.pending_vendors}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
