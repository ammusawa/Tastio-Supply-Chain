'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import tokenManager from '@/utils/tokenManager';
import { 
  Package, 
  ChefHat, 
  Star, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Calendar,
  Plus,
  Edit,
  Eye,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
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

interface VendorStats {
  total_orders: number;
  total_meals: number;
  average_rating: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  profile_picture?: string;
}

interface Order {
  id: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';
  quantity: number;
  total_amount: number;
  created_at: string;
  meal: {
    id: number;
    name: string;
    price: number;
  };
  customer: {
    id: number;
    name: string;
    email: string;
  };
}

interface Meal {
  id: number;
  name: string;
  price: number;
  availability: boolean;
  created_at: string;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    orderTrends: [] as Array<{date: string; orders: number; revenue: number}>,
    revenueData: [] as Array<{date: string; orders: number; revenue: number}>,
    mealPerformance: [] as Array<{name: string; orders: number; revenue: number}>,
    statusDistribution: [] as Array<{status: string; count: number; percentage: number}>
  });

  useEffect(() => {
    console.log('Vendor dashboard loading...');
    const token = tokenManager.getToken();
    console.log('Token available:', !!token);
    
    if (!token) {
      console.log('No token found, redirecting to login');
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        console.log('Fetching vendor data...');
        setIsLoading(true);
        
        // Fetch vendor stats
        const statsResponse = await fetch('http://localhost:8000/api/vendors/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
        
        // Fetch vendor profile
        const profileResponse = await fetch('http://localhost:8000/api/vendors/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setVendorProfile(profileData);
        }

        // Fetch recent orders
        const ordersResponse = await fetch('http://localhost:8000/api/orders?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setRecentOrders(ordersData.orders || []);
          // Generate analytics data
          generateAnalyticsData(ordersData.orders || []);
        }

        // Fetch vendor meals
        const mealsResponse = await fetch('http://localhost:8000/api/vendors/meals', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (mealsResponse.ok) {
          const mealsData = await mealsResponse.json();
          setMeals(mealsData.meals || []);
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        toast.error('Failed to load vendor data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleOrderAction = async (orderId: number, action: string) => {
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      // Map action to status
      const statusMap: { [key: string]: string } = {
        'accept': 'accepted',
        'reject': 'rejected',
        'preparing': 'preparing',
        'ready': 'ready',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered'
      };

      const newStatus = statusMap[action];
      if (!newStatus) {
        toast.error('Invalid action');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (response.ok) {
        toast.success(`Order ${action}ed successfully`);
        // Refresh data
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.detail || `Failed to ${action} order`);
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(`Failed to ${action} order`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'accepted':
        return 'text-blue-600 bg-blue-100';
      case 'preparing':
        return 'text-orange-600 bg-orange-100';
      case 'ready':
        return 'text-purple-600 bg-purple-100';
      case 'out_for_delivery':
        return 'text-indigo-600 bg-indigo-100';
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'preparing':
        return <Clock className="h-4 w-4" />;
      case 'ready':
        return <Package className="h-4 w-4" />;
      case 'out_for_delivery':
        return <Package className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const generateAnalyticsData = (orders: Order[]) => {
    // Generate order trends for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const orderTrends = last7Days.map(date => {
      const dayOrders = orders.filter(order => 
        order.created_at.startsWith(date)
      );
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + order.total_amount, 0)
      };
    });

    // Generate meal performance data
    const mealStats = orders.reduce((acc, order) => {
      const mealName = order.meal?.name || 'Unknown';
      if (!acc[mealName]) {
        acc[mealName] = { orders: 0, revenue: 0 };
      }
      acc[mealName].orders += 1;
      acc[mealName].revenue += order.total_amount;
      return acc;
    }, {} as Record<string, { orders: number; revenue: number }>);

    const mealPerformance = Object.entries(mealStats)
      .map(([name, stats]) => ({
        name,
        orders: stats.orders,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Generate status distribution
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: Math.round((count / orders.length) * 100)
    }));

    setAnalyticsData({
      orderTrends,
      revenueData: orderTrends,
      mealPerformance,
      statusDistribution
    });
  };

  const getChartColors = (index: number) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vendor Profile Section - FIRST */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {vendorProfile?.profile_picture ? (
                <img
                  src={vendorProfile.profile_picture}
                  alt="Vendor profile"
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <ChefHat className={`h-8 w-8 text-primary-600 ${vendorProfile?.profile_picture ? 'hidden' : ''}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Welcome back!</h2>
              <p className="text-gray-600">Manage your meals, track orders, and grow your business</p>
            </div>
            <Link
              href="/profile/edit"
              className="btn-primary flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </Link>
          </div>
        </div>

        {/* Main Stats Cards - SECOND */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                  <p className="text-3xl font-bold">{stats.total_orders}</p>
                </div>
                <div className="p-3 bg-blue-400 bg-opacity-30 rounded-lg">
                  <Package className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold">₦{stats.total_revenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-400 bg-opacity-30 rounded-lg">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Active Meals</p>
                  <p className="text-3xl font-bold">{stats.total_meals}</p>
                </div>
                <div className="p-3 bg-purple-400 bg-opacity-30 rounded-lg">
                  <ChefHat className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Orders</p>
                  <p className="text-3xl font-bold">{stats.pending_orders || 0}</p>
                </div>
                <div className="p-3 bg-orange-400 bg-opacity-30 rounded-lg">
                  <Clock className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Horizontal */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/vendor/meals/add"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-5 w-5 text-primary-600 mr-3" />
              <span className="font-medium text-gray-900">Add New Meal</span>
            </Link>
            <Link
              href="/vendor/orders"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-5 w-5 text-primary-600 mr-3" />
              <span className="font-medium text-gray-900">View All Orders</span>
            </Link>
                            <Link
                  href="/profile"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-5 w-5 text-primary-600 mr-3" />
                  <span className="font-medium text-gray-900">Edit Profile</span>
                </Link>
          </div>
          </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
            <Link href="/vendor/orders" className="text-primary-600 hover:text-primary-700">
              View All Orders →
            </Link>
          </div>
                  <div className="space-y-4">
                    {recentOrders.length === 0 ? (
                      <p className="text-gray-500">No recent orders</p>
                    ) : (
                      recentOrders.map(order => (
                <div key={order.id || `order-${Math.random()}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <ChefHat className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                      <h4 className="font-medium text-gray-900">{order.meal?.name || 'Unknown Meal'}</h4>
                      <p className="text-sm text-gray-600">Order #{order.id || 'N/A'} • {order.customer?.name || 'Unknown Customer'}</p>
                              <p className="text-sm text-gray-500">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Date not available'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'pending')}`}>
                      {getStatusIcon(order.status || 'pending')}
                      <span className="capitalize">{order.status || 'pending'}</span>
                            </div>
                    <span className="font-medium text-gray-900">₦{(order.total_amount || 0).toLocaleString()}</span>
                            <Link
                      href={`/vendor/orders`}
                              className="text-primary-600 hover:text-primary-700"
                      title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

        {/* Meal Revenue Performance - MOVED TO TOP */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
                <div>
              <h3 className="text-lg font-medium text-gray-900">Meal Revenue Performance</h3>
              <p className="text-sm text-gray-600">Revenue generated by each meal</p>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">Revenue</span>
                  </div>
                </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Order Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.mealPerformance.map((meal, index) => (
                  <tr key={meal.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: getChartColors(index) }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">{meal.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {meal.orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{meal.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{Math.round(meal.revenue / meal.orders).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
              </div>

        {/* Analytics Section */}
        <div className="space-y-8">
          {/* Order Trends Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Order Trends (Last 7 Days)</h3>
                <p className="text-sm text-gray-600">Track your daily order volume and revenue</p>
                </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Trends</span>
                          </div>
                        </div>
            <div className="h-80">
              <Line
                data={{
                  labels: analyticsData.orderTrends.map(item => item.date),
                  datasets: [
                    {
                      label: 'Orders',
                      data: analyticsData.orderTrends.map(item => item.orders),
                      borderColor: '#3B82F6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Revenue (₦)',
                      data: analyticsData.orderTrends.map(item => item.revenue),
                      borderColor: '#10B981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      tension: 0.4,
                      fill: true,
                      yAxisID: 'y1',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Date'
                      }
                    },
                    y: {
                      type: 'linear' as const,
                      display: true,
                      position: 'left' as const,
                      title: {
                        display: true,
                        text: 'Orders'
                      }
                    },
                    y1: {
                      type: 'linear' as const,
                      display: true,
                      position: 'right' as const,
                      title: {
                        display: true,
                        text: 'Revenue (₦)'
                      },
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: false,
                    },
                  },
                }}
              />
                        </div>
                      </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meal Performance Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Top Performing Meals</h3>
                  <p className="text-sm text-gray-600">Orders by meal</p>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Performance</span>
                </div>
              </div>
              <div className="h-80">
                <Bar
                  data={{
                    labels: analyticsData.mealPerformance.map(item => item.name),
                    datasets: [
                      {
                        label: 'Orders',
                        data: analyticsData.mealPerformance.map(item => item.orders),
                        backgroundColor: analyticsData.mealPerformance.map((_, index) => getChartColors(index)),
                        borderRadius: 4,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Orders'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Meals'
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
              <div>
                  <h3 className="text-lg font-medium text-gray-900">Order Status Distribution</h3>
                  <p className="text-sm text-gray-600">Current order status breakdown</p>
                </div>
                <div className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Distribution</span>
                </div>
              </div>
              <div className="h-80">
                <Doughnut
                  data={{
                    labels: analyticsData.statusDistribution.map(item => item.status),
                    datasets: [
                      {
                        data: analyticsData.statusDistribution.map(item => item.count),
                        backgroundColor: analyticsData.statusDistribution.map((_, index) => getChartColors(index)),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
