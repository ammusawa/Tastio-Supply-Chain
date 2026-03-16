'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  AlertCircle,
  Lightbulb,
  HelpCircle,
  Reply,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Message {
  id: number;
  subject: string;
  content: string;
  message_type: 'complaint' | 'suggestion' | 'inquiry' | 'reply';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  sender_name: string;
  sender_email: string;
  sender_role: string;
  target_user_name?: string;
  target_user_email?: string;
  target_user_role?: string;
  created_at: string;
  parent_message_id?: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function MessageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const messageId = params.id as string;
  
  const [message, setMessage] = useState<Message | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // Check if we should show reply form automatically
  const shouldShowReply = searchParams.get('reply') === 'true';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUserAndMessage();
  }, [messageId, router]);

  // Set reply form visibility based on URL parameter
  useEffect(() => {
    if (shouldShowReply) {
      setShowReplyForm(true);
    }
  }, [shouldShowReply]);

  const fetchUserAndMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user info
      const userResponse = await fetch('http://localhost:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      // Fetch message details
      const messageResponse = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (messageResponse.ok) {
        const messageData = await messageResponse.json();
        setMessage(messageData);
      } else {
        toast.error('Message not found or access denied');
        router.push('/messages');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load message');
      router.push('/messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: replyContent
        })
      });

      if (response.ok) {
        toast.success('Reply sent successfully!');
        setReplyContent('');
        setShowReplyForm(false);
        // Refresh the message to show updated status
        fetchUserAndMessage();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMessageStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/messages/${messageId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        toast.success('Message status updated successfully!');
        fetchUserAndMessage();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'complaint':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'inquiry':
        return <HelpCircle className="h-5 w-5 text-blue-500" />;
      case 'reply':
        return <Reply className="h-5 w-5 text-green-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint':
        return 'bg-red-100 text-red-800';
      case 'suggestion':
        return 'bg-yellow-100 text-yellow-800';
      case 'inquiry':
        return 'bg-blue-100 text-blue-800';
      case 'reply':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading message...</p>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Message not found</h3>
          <p className="text-gray-600 mb-6">The message you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/messages" className="btn-primary">
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

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
          
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {getMessageTypeIcon(message.message_type)}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{message.subject}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(message.message_type)}`}>
                    {message.message_type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                    {message.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            {user?.role === 'admin' && (
              <div className="flex items-center space-x-3">
                <select
                  value={message.status}
                  onChange={(e) => updateMessageStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Reply className="h-4 w-4" />
                  <span>Reply</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl">
          {/* Message Details */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{message.sender_name}</p>
                  <p className="text-sm text-gray-500">{message.sender_email} ({message.sender_role})</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date(message.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {message.target_user_name && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Complaint about:</strong> {message.target_user_name} ({message.target_user_email} - {message.target_user_role})
                </p>
              </div>
            )}

            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>

          {/* Reply Form (Admin or Target User) */}
          {((user?.role === 'admin' || message?.target_user_email === user?.email) && showReplyForm) && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Reply</h3>
              <form onSubmit={handleReply}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Enter your reply..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none mb-4"
                  required
                />
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyContent('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quick Reply Button (Admin or Target User) */}
          {(user?.role === 'admin' || message?.target_user_email === user?.email) && !showReplyForm && (
            <div className="text-center">
              <button
                onClick={() => setShowReplyForm(true)}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <Reply className="h-4 w-4" />
                <span>Reply to this message</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
