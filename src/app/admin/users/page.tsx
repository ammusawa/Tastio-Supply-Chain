'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  ChefHat, 
  User, 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Package,
  DollarSign,
  Star,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'admin';
  is_active: boolean;
  created_at: string;
}

interface Vendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  description: string;
  address: string;
  approved_status: boolean;
  created_at: string;
  total_orders: number;
  total_revenue: number;
  total_meals: number;
  average_rating: number;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'vendors' | 'admins' | 'customers'>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [vendorToRevoke, setVendorToRevoke] = useState<Vendor | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'reject' | 'revoke' | 'delete';
    title: string;
    message: string;
    vendorId?: number;
    userId?: number;
    userName?: string;
  } | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer' as 'customer' | 'vendor' | 'admin'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch vendors using admin endpoint
      const vendorsResponse = await fetch('http://localhost:8000/api/admin/vendors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (vendorsResponse.ok) {
        const vendorsData = await vendorsResponse.json();
        setVendors(Array.isArray(vendorsData.vendors) ? vendorsData.vendors : []);
      } else {
        console.error('Vendors response not ok:', vendorsResponse.status);
        setVendors([]);
      }

      // Fetch all users and filter by role
      const usersResponse = await fetch('http://localhost:8000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const usersArray = Array.isArray(usersData) ? usersData : [];
        setAdmins(usersArray.filter((user: User) => user.role === 'admin'));
        setCustomers(usersArray.filter((user: User) => user.role === 'customer'));
      } else {
        console.error('Users response not ok:', usersResponse.status);
        setAdmins([]);
        setCustomers([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
      setVendors([]);
      setAdmins([]);
      setCustomers([]);
      setLoading(false);
    }
  };

  const handleApproveVendor = async (vendorId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/admin/vendors/${vendorId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Vendor approved successfully');
        fetchUsers();
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
    setConfirmAction({
      type: 'reject',
      title: 'Confirm Rejection',
      message: 'Are you sure you want to reject this vendor? This action cannot be undone.',
      vendorId: vendorId,
    });
    setShowConfirmModal(true);
  };

  const handleRevokeVendor = async (vendorId: number) => {
    setConfirmAction({
      type: 'revoke',
      title: 'Confirm Revocation',
      message: 'Are you sure you want to revoke this vendor\'s approval? This will prevent them from receiving new orders.',
      vendorId: vendorId,
    });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      const token = localStorage.getItem('token');
      let url = '';
      let method = 'POST';

      if (confirmAction.type === 'reject') {
        url = `http://localhost:8000/api/admin/vendors/${confirmAction.vendorId}/reject`;
      } else if (confirmAction.type === 'revoke') {
        url = `http://localhost:8000/api/admin/vendors/${confirmAction.vendorId}/reject`; // Reusing reject endpoint for revoke
      } else if (confirmAction.type === 'delete') {
        url = `http://localhost:8000/api/admin/users/${confirmAction.userId}`;
        method = 'DELETE';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success(`Vendor ${confirmAction.type}ed successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || `Failed to ${confirmAction.type} vendor`);
      }
    } catch (error) {
      console.error('Error confirming action:', error);
      toast.error(`Failed to ${confirmAction.type} vendor`);
    } finally {
      setConfirmAction(null);
      setShowConfirmModal(false);
    }
  };

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        toast.success('User created successfully');
        setShowAddModal(false);
        setNewUser({ name: '', email: '', phone: '', password: '', role: 'customer' });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setConfirmAction({
      type: 'delete',
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this user?',
      userId: userId,
    });
    setShowConfirmModal(true);
  };

  const filteredVendors = Array.isArray(vendors) ? vendors.filter(vendor => {
    const matchesSearch = vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = vendorStatusFilter === 'all' || 
                         (vendorStatusFilter === 'pending' && !vendor.approved_status) ||
                         (vendorStatusFilter === 'approved' && vendor.approved_status);
    
    return matchesSearch && matchesStatus;
  }) : [];

  const filteredAdmins = Array.isArray(admins) ? admins.filter(admin =>
    admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredCustomers = Array.isArray(customers) ? customers.filter(customer =>
    customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">Manage vendors, admins, and customers</p>
        </div>

        {/* Search and Add User */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'vendors'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChefHat className="h-4 w-4" />
              Vendor Management ({vendors.length})
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'admins'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin Management ({admins.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'customers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="h-4 w-4" />
              Customer Management ({customers.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Vendor Management Tab */}
          {activeTab === 'vendors' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Vendor Management</h2>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={vendorStatusFilter}
                    onChange={(e) => setVendorStatusFilter(e.target.value as 'all' | 'pending' | 'approved')}
                    className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Vendors</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
              
              {filteredVendors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No vendors found</p>
              ) : (
                <div className="space-y-4">
                  {filteredVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                vendor.approved_status
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {vendor.approved_status ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1" />
                                {vendor.email}
                              </div>
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-1" />
                                {vendor.phone}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {vendor.address}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{vendor.description}</p>
                            
                            {/* Vendor Stats */}
                            <div className="flex items-center space-x-6">
                              <div className="flex items-center text-sm text-gray-500">
                                <Package className="h-4 w-4 mr-1" />
                                {vendor.total_orders} orders
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <DollarSign className="h-4 w-4 mr-1" />
                                ₦{vendor.total_revenue.toLocaleString()}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <ChefHat className="h-4 w-4 mr-1" />
                                {vendor.total_meals} meals
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Star className="h-4 w-4 mr-1" />
                                {vendor.average_rating.toFixed(1)} rating
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(vendor.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {!vendor.approved_status ? (
                            <>
                              <button
                                onClick={() => handleApproveVendor(vendor.id)}
                                className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectVendor(vendor.id)}
                                className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setVendorToRevoke(vendor);
                                setShowRevokeModal(true);
                              }}
                              className="flex items-center px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Revoke Approval
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin Management Tab */}
          {activeTab === 'admins' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Management</h2>
              {filteredAdmins.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No admins found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAdmins.map((admin) => (
                        <tr key={admin.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{admin.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              admin.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteUser(admin.id)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Customer Management Tab */}
          {activeTab === 'customers' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Management</h2>
              {filteredCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No customers found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{customer.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              customer.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteUser(customer.id)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Revoke Vendor Confirmation Modal */}
      {showRevokeModal && vendorToRevoke && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <XCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Revoke Vendor Approval</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to revoke approval for <strong>{vendorToRevoke.name}</strong>? 
                This will prevent them from receiving new orders until re-approved.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRevokeModal(false);
                    setVendorToRevoke(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`http://localhost:8000/api/admin/vendors/${vendorToRevoke.id}/revoke`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });

                      if (response.ok) {
                        toast.success('Vendor approval revoked successfully');
                        setShowRevokeModal(false);
                        setVendorToRevoke(null);
                        fetchUsers();
                      } else {
                        const error = await response.json();
                        toast.error(error.detail || 'Failed to revoke vendor approval');
                      }
                    } catch (error) {
                      console.error('Error revoking vendor approval:', error);
                      toast.error('Failed to revoke vendor approval');
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                >
                  Revoke Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'customer' | 'vendor' | 'admin' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{confirmAction.title}</h3>
              <p className="text-sm text-gray-700 mb-4">{confirmAction.message}</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  {confirmAction.type === 'delete' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}