'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  AlertCircle,
  Lightbulb,
  HelpCircle,
  Send,
  User,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface TargetUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function NewMessagePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TargetUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TargetUser | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'inquiry',
    subject: '',
    content: '',
    target_user_id: null as number | null,
    send_to_all_admins: false,
    send_to_all_customers: false,
    show_customer_selection: false,
    show_vendor_selection: false,
    send_to_all_vendors: false,
    show_admin_selection: false
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUser();
    
    // Check for pre-filled message data from order management
    const prefilledMessage = localStorage.getItem('prefilledMessage');
    if (prefilledMessage) {
      try {
        const messageData = JSON.parse(prefilledMessage);
        setFormData({
          type: messageData.type || 'inquiry',
          subject: messageData.subject || '',
          content: messageData.content || '',
          target_user_id: messageData.target_user_id || null,
          send_to_all_admins: false,
          send_to_all_customers: false,
          show_customer_selection: false,
          show_vendor_selection: false,
          send_to_all_vendors: false,
          show_admin_selection: false
        });
        
        // If we have a target user ID, set it directly
        if (messageData.target_user_id) {
          setFormData(prev => ({
            ...prev,
            target_user_id: messageData.target_user_id
          }));
        }
        
        // Clear the prefilled data
        localStorage.removeItem('prefilledMessage');
      } catch (error) {
        console.error('Error parsing prefilled message:', error);
      }
    }
  }, [router]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const searchUsers = async (term: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Determine search URL based on context
      let searchUrl = `http://localhost:8000/api/users/search?q=${encodeURIComponent(term)}`;
      
      if (user?.role === 'vendor' && formData.show_customer_selection) {
        searchUrl += '&role=customer';
      } else if (user?.role === 'customer' && formData.show_vendor_selection) {
        searchUrl += '&role=vendor';
      } else if (user?.role === 'admin' && formData.show_customer_selection) {
        searchUrl += '&role=customer';
      } else if (user?.role === 'admin' && formData.show_vendor_selection) {
        searchUrl += '&role=vendor';
      } else if (user?.role === 'admin' && formData.show_admin_selection) {
        searchUrl += '&role=admin';
      }
      
      const response = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/search?q=', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/search?q=&role=customer', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAllVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/search?q=&role=vendor', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchAllAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/search?q=&role=admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };



  // Search functionality for customer selection (vendors)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.role === 'vendor' && formData.show_customer_selection) {
        if (searchTerm.trim()) {
          searchUsers(searchTerm);
        } else {
          fetchAllCustomers();
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, formData.show_customer_selection, user?.role]);

  // Fetch all customers when customer selection is activated (vendors)
  useEffect(() => {
    if (user?.role === 'vendor' && formData.show_customer_selection && !searchTerm.trim()) {
      fetchAllCustomers();
    }
  }, [formData.show_customer_selection, user?.role]);

  // Search functionality for vendor selection (customers)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.role === 'customer' && formData.show_vendor_selection) {
        if (searchTerm.trim()) {
          searchUsers(searchTerm);
        } else {
          fetchAllVendors();
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, formData.show_vendor_selection, user?.role]);

  // Fetch all vendors when vendor selection is activated (customers)
  useEffect(() => {
    if (user?.role === 'customer' && formData.show_vendor_selection && !searchTerm.trim()) {
      fetchAllVendors();
    }
  }, [formData.show_vendor_selection, user?.role]);

  // Search functionality for admin selection (admins)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.role === 'admin' && formData.show_admin_selection) {
        if (searchTerm.trim()) {
          searchUsers(searchTerm);
        } else {
          fetchAllAdmins();
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, formData.show_admin_selection, user?.role]);

  // Fetch all admins when admin selection is activated (admins)
  useEffect(() => {
    if (user?.role === 'admin' && formData.show_admin_selection && !searchTerm.trim()) {
      fetchAllAdmins();
    }
  }, [formData.show_admin_selection, user?.role]);

  // Search functionality for customer selection (admins)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.role === 'admin' && formData.show_customer_selection) {
        if (searchTerm.trim()) {
          searchUsers(searchTerm);
        } else {
          fetchAllCustomers();
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, formData.show_customer_selection, user?.role]);

  // Fetch all customers when customer selection is activated (admins)
  useEffect(() => {
    if (user?.role === 'admin' && formData.show_customer_selection && !searchTerm.trim()) {
      fetchAllCustomers();
    }
  }, [formData.show_customer_selection, user?.role]);

  // Search functionality for vendor selection (admins)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user?.role === 'admin' && formData.show_vendor_selection) {
        if (searchTerm.trim()) {
          searchUsers(searchTerm);
        } else {
          fetchAllVendors();
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, formData.show_vendor_selection, user?.role]);

  // Fetch all vendors when vendor selection is activated (admins)
  useEffect(() => {
    if (user?.role === 'admin' && formData.show_vendor_selection && !searchTerm.trim()) {
      fetchAllVendors();
    }
  }, [formData.show_vendor_selection, user?.role]);

  // Search functionality for complaint user search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (showUserSearch) {
        if (searchTerm.trim()) {
          searchUsers(searchTerm);
        } else {
          fetchAllUsers();
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, showUserSearch]);

  // Fetch all users when complaint search modal opens
  useEffect(() => {
    if (showUserSearch && !searchTerm.trim()) {
      fetchAllUsers();
    }
  }, [showUserSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare the message data
      const messageData: any = {
        type: formData.type,
        subject: formData.subject,
        content: formData.content,
        target_user_id: formData.target_user_id
      };

             // Add vendor-specific targeting
       if (user?.role === 'vendor') {
         if (formData.send_to_all_admins) {
           messageData.send_to_all_admins = true;
         } else if (selectedCustomers.length > 0) {
           messageData.selected_customer_ids = selectedCustomers;
         }
       }

               // Add customer-specific targeting
        if (user?.role === 'customer') {
          if (formData.send_to_all_admins) {
            messageData.send_to_all_admins = true;
          } else if (selectedVendors.length > 0) {
            messageData.selected_vendor_ids = selectedVendors;
          }
        }

        // Add admin-specific targeting
        if (user?.role === 'admin') {
          if (formData.send_to_all_customers) {
            messageData.send_to_all_customers = true;
          } else if (formData.send_to_all_vendors) {
            messageData.send_to_all_vendors = true;
          } else if (selectedCustomers.length > 0) {
            messageData.selected_customer_ids = selectedCustomers;
          } else if (selectedVendors.length > 0) {
            messageData.selected_vendor_ids = selectedVendors;
          } else if (selectedAdmins.length > 0) {
            messageData.selected_admin_ids = selectedAdmins;
          }
        }

      const response = await fetch('http://localhost:8000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Message sent successfully!');
        router.push('/messages');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMessageTypeInfo = (type: string) => {
    switch (type) {
      case 'complaint':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: 'Complaint',
          description: 'Report an issue or problem you\'ve experienced',
          color: 'text-red-600'
        };
      case 'suggestion':
        return {
          icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
          title: 'Suggestion',
          description: 'Share ideas for improving our service',
          color: 'text-yellow-600'
        };
      case 'inquiry':
        return {
          icon: <HelpCircle className="h-5 w-5 text-blue-500" />,
          title: 'Inquiry',
          description: 'Ask a question or request information',
          color: 'text-blue-600'
        };
      default:
        return {
          icon: <HelpCircle className="h-5 w-5 text-gray-500" />,
          title: 'Message',
          description: 'Send a general message',
          color: 'text-gray-600'
        };
    }
  };

  const typeInfo = getMessageTypeInfo(formData.type);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/messages"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Messages</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-3">
            {typeInfo.icon}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New {typeInfo.title}</h1>
              <p className="text-lg text-gray-600">{typeInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message Type */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Message Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'inquiry', label: 'Inquiry', icon: <HelpCircle className="h-4 w-4" /> },
                  { value: 'complaint', label: 'Complaint', icon: <AlertCircle className="h-4 w-4" /> },
                  { value: 'suggestion', label: 'Suggestion', icon: <Lightbulb className="h-4 w-4" /> }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.type === type.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {type.icon}
                      <span className="font-medium">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

                         {/* Vendor Message Targeting */}
             {user?.role === 'vendor' && (
               <div className="bg-white rounded-lg shadow-sm p-6">
                 <label className="block text-sm font-medium text-gray-700 mb-3">
                   Send To
                 </label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <button
                     type="button"
                     onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: true, send_to_all_customers: false, show_customer_selection: false, show_vendor_selection: false })}
                     className={`p-3 rounded-lg border-2 transition-colors ${
                       formData.send_to_all_admins
                         ? 'border-primary-500 bg-primary-50 text-primary-700'
                         : 'border-gray-200 hover:border-gray-300 text-gray-700'
                     }`}
                   >
                     <div className="flex items-center space-x-2">
                       <User className="h-4 w-4" />
                       <span className="font-medium">Send to All Admins</span>
                     </div>
                   </button>
                   <button
                     type="button"
                     onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: false, show_customer_selection: true, show_vendor_selection: false })}
                     className={`p-3 rounded-lg border-2 transition-colors ${
                       formData.show_customer_selection
                         ? 'border-primary-500 bg-primary-50 text-primary-700'
                         : 'border-gray-200 hover:border-gray-300 text-gray-700'
                     }`}
                   >
                     <div className="flex items-center space-x-2">
                       <User className="h-4 w-4" />
                       <span className="font-medium">Select Customers</span>
                     </div>
                   </button>
                 </div>
                 <p className="text-sm text-gray-500 mt-2">
                   Choose to send your message to all admins or select specific customers. Leave unselected to send to a specific user.
                 </p>
                 
                 {/* Show selected targeting info */}
                 {formData.send_to_all_admins && (
                   <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                     <p className="text-sm text-blue-800">
                       <strong>Targeting:</strong> All Admins
                     </p>
                   </div>
                 )}
               </div>
             )}

                           {/* Customer Message Targeting */}
              {user?.role === 'customer' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Send To
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: true, send_to_all_customers: false, show_customer_selection: false, show_vendor_selection: false, send_to_all_vendors: false, show_admin_selection: false })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.send_to_all_admins
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Send to All Admins</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: false, show_customer_selection: false, show_vendor_selection: true, send_to_all_vendors: false, show_admin_selection: false })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.show_vendor_selection
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Select Vendors</span>
                      </div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Choose to send your message to all admins or select specific vendors. Leave unselected to send to a specific user.
                  </p>
                  
                  {/* Show selected targeting info */}
                  {formData.send_to_all_admins && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Targeting:</strong> All Admins
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Message Targeting */}
              {user?.role === 'admin' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Send To
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: true, show_customer_selection: false, show_vendor_selection: false, send_to_all_vendors: false, show_admin_selection: false })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.send_to_all_customers
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">All Customers</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: false, show_customer_selection: false, show_vendor_selection: false, send_to_all_vendors: true, show_admin_selection: false })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.send_to_all_vendors
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">All Vendors</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: false, show_customer_selection: false, show_vendor_selection: false, send_to_all_vendors: false, show_admin_selection: true })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.show_admin_selection
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Select Admins</span>
                      </div>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: false, show_customer_selection: true, show_vendor_selection: false, send_to_all_vendors: false, show_admin_selection: false })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.show_customer_selection
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Select Customers</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_user_id: null, send_to_all_admins: false, send_to_all_customers: false, show_customer_selection: false, show_vendor_selection: true, send_to_all_vendors: false, show_admin_selection: false })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.show_vendor_selection
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Select Vendors</span>
                      </div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Choose to send your message to all users of a specific role or select specific users. Leave unselected to send to a specific user.
                  </p>
                  
                  {/* Show selected targeting info */}
                  {formData.send_to_all_customers && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Targeting:</strong> All Customers
                      </p>
                    </div>
                  )}
                  {formData.send_to_all_vendors && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Targeting:</strong> All Vendors
                      </p>
                    </div>
                  )}
                </div>
              )}

                         {/* Customer Selection for Vendors */}
             {user?.role === 'vendor' && formData.show_customer_selection && (
               <div className="bg-white rounded-lg shadow-sm p-6">
                 <label className="block text-sm font-medium text-gray-700 mb-3">
                   Select Customers
                 </label>
                 
                 {/* Search customers */}
                 <div className="relative mb-4">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <input
                     type="text"
                     placeholder="Search customers by name or email..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   />
                 </div>

                 {/* Customer dropdown list */}
                 <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-gray-200 rounded-lg p-2">
                   {searchResults.map((customer) => (
                     <div key={customer.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                       <input
                         type="checkbox"
                         id={`customer-${customer.id}`}
                         checked={selectedCustomers.includes(customer.id)}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setSelectedCustomers([...selectedCustomers, customer.id]);
                           } else {
                             setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                           }
                         }}
                         className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                       />
                       <label htmlFor={`customer-${customer.id}`} className="flex-1 cursor-pointer">
                         <p className="font-medium text-gray-900">{customer.name}</p>
                         <p className="text-sm text-gray-500">{customer.email}</p>
                       </label>
                     </div>
                   ))}
                   {searchResults.length === 0 && (
                     <p className="text-center text-gray-500 py-4">No customers available</p>
                   )}
                 </div>

                 {/* Action buttons */}
                 <div className="flex space-x-2 mb-4">
                   <button
                     type="button"
                     onClick={() => {
                       const allCustomerIds = searchResults.map(c => c.id);
                       setSelectedCustomers(allCustomerIds);
                     }}
                     className="flex-1 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                   >
                     Select All
                   </button>
                   <button
                     type="button"
                     onClick={() => setSelectedCustomers([])}
                     className="flex-1 p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                   >
                     Clear All
                   </button>
                 </div>

                 {/* Show selected count */}
                 {selectedCustomers.length > 0 && (
                   <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                     <p className="text-sm text-green-800">
                       <strong>Selected:</strong> {selectedCustomers.length} customer(s)
                     </p>
                   </div>
                 )}
               </div>
             )}

                           {/* Vendor Selection for Customers */}
              {user?.role === 'customer' && formData.show_vendor_selection && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Vendors
                  </label>
                  
                  {/* Search vendors */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Vendor dropdown list */}
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-gray-200 rounded-lg p-2">
                    {searchResults.map((vendor) => (
                      <div key={vendor.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`vendor-${vendor.id}`}
                          checked={selectedVendors.includes(vendor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVendors([...selectedVendors, vendor.id]);
                            } else {
                              setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`vendor-${vendor.id}`} className="flex-1 cursor-pointer">
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-sm text-gray-500">{vendor.email}</p>
                        </label>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No vendors available</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const allVendorIds = searchResults.map(v => v.id);
                        setSelectedVendors(allVendorIds);
                      }}
                      className="flex-1 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVendors([])}
                      className="flex-1 p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Show selected count */}
                  {selectedVendors.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedVendors.length} vendor(s)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Selection for Admins */}
              {user?.role === 'admin' && formData.show_admin_selection && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Admins
                  </label>
                  
                  {/* Search admins */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search admins by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Admin dropdown list */}
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-gray-200 rounded-lg p-2">
                    {searchResults.map((admin) => (
                      <div key={admin.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`admin-${admin.id}`}
                          checked={selectedAdmins.includes(admin.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAdmins([...selectedAdmins, admin.id]);
                            } else {
                              setSelectedAdmins(selectedAdmins.filter(id => id !== admin.id));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`admin-${admin.id}`} className="flex-1 cursor-pointer">
                          <p className="font-medium text-gray-900">{admin.name}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </label>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No admins available</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const allAdminIds = searchResults.map(a => a.id);
                        setSelectedAdmins(allAdminIds);
                      }}
                      className="flex-1 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAdmins([])}
                      className="flex-1 p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Show selected count */}
                  {selectedAdmins.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedAdmins.length} admin(s)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Selection for Admins */}
              {user?.role === 'admin' && formData.show_customer_selection && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Customers
                  </label>
                  
                  {/* Search customers */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search customers by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Customer dropdown list */}
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-gray-200 rounded-lg p-2">
                    {searchResults.map((customer) => (
                      <div key={customer.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`customer-${customer.id}`}
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomers([...selectedCustomers, customer.id]);
                            } else {
                              setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`customer-${customer.id}`} className="flex-1 cursor-pointer">
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </label>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No customers available</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const allCustomerIds = searchResults.map(c => c.id);
                        setSelectedCustomers(allCustomerIds);
                      }}
                      className="flex-1 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomers([])}
                      className="flex-1 p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Show selected count */}
                  {selectedCustomers.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedCustomers.length} customer(s)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor Selection for Admins */}
              {user?.role === 'admin' && formData.show_vendor_selection && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Vendors
                  </label>
                  
                  {/* Search vendors */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Vendor dropdown list */}
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-gray-200 rounded-lg p-2">
                    {searchResults.map((vendor) => (
                      <div key={vendor.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`vendor-${vendor.id}`}
                          checked={selectedVendors.includes(vendor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVendors([...selectedVendors, vendor.id]);
                            } else {
                              setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`vendor-${vendor.id}`} className="flex-1 cursor-pointer">
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-sm text-gray-500">{vendor.email}</p>
                        </label>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No vendors available</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const allVendorIds = searchResults.map(v => v.id);
                        setSelectedVendors(allVendorIds);
                      }}
                      className="flex-1 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVendors([])}
                      className="flex-1 p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Show selected count */}
                  {selectedVendors.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedVendors.length} vendor(s)
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* Subject */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter a clear subject for your message"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

                         {/* Target User (for complaints) */}
             {formData.type === 'complaint' && !formData.send_to_all_admins && !formData.show_customer_selection && !formData.show_vendor_selection && !formData.send_to_all_customers && !formData.send_to_all_vendors && !formData.show_admin_selection && (
               <div className="bg-white rounded-lg shadow-sm p-6">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Complaint About (Optional)
                 </label>
                 <div className="space-y-3">
                   {selectedUser ? (
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                       <div className="flex items-center space-x-3">
                         <User className="h-5 w-5 text-gray-400" />
                         <div>
                           <p className="font-medium text-gray-900">{selectedUser.name}</p>
                           <p className="text-sm text-gray-500">{selectedUser.email} ({selectedUser.role})</p>
                         </div>
                       </div>
                       <button
                         type="button"
                         onClick={() => {
                           setSelectedUser(null);
                           setFormData({ ...formData, target_user_id: null });
                         }}
                         className="text-red-600 hover:text-red-700 text-sm font-medium"
                       >
                         Remove
                       </button>
                     </div>
                   ) : (
                     <button
                       type="button"
                       onClick={() => setShowUserSearch(true)}
                       className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                     >
                       <div className="flex items-center space-x-2">
                         <Search className="h-4 w-4" />
                         <span>Search for a specific user</span>
                       </div>
                     </button>
                   )}
                 </div>

                 {/* User Search Modal */}
                 {showUserSearch && (
                   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                     <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                       <h3 className="text-lg font-medium text-gray-900 mb-4">Search Users</h3>
                       
                       <div className="relative mb-4">
                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                         <input
                           type="text"
                           placeholder="Search by name or email..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                         />
                       </div>

                       <div className="max-h-60 overflow-y-auto space-y-2">
                         {searchResults.map((user) => (
                           <button
                             key={user.id}
                             type="button"
                             onClick={() => {
                               setSelectedUser(user);
                               setFormData({ ...formData, target_user_id: user.id });
                               setShowUserSearch(false);
                               setSearchTerm('');
                               setSearchResults([]);
                             }}
                             className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                           >
                             <p className="font-medium text-gray-900">{user.name}</p>
                             <p className="text-sm text-gray-500">{user.email} ({user.role})</p>
                           </button>
                         ))}
                         {searchTerm && searchResults.length === 0 && (
                           <p className="text-center text-gray-500 py-4">No users found</p>
                         )}
                         {!searchTerm && searchResults.length === 0 && (
                           <p className="text-center text-gray-500 py-4">Loading users...</p>
                         )}
                       </div>

                       <div className="flex justify-end space-x-3 mt-4">
                         <button
                           type="button"
                           onClick={() => {
                             setShowUserSearch(false);
                             setSearchTerm('');
                             setSearchResults([]);
                           }}
                           className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                         >
                           Cancel
                         </button>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             )}

            {/* Content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Message Content *
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Describe your issue, suggestion, or question in detail..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Be specific and provide relevant details to help us assist you better.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/messages"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
