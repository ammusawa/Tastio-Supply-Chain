'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: number;
    payment_method: string;
    payment_status: string;
    payment_confirmed_by_vendor: boolean;
    payment_proof_url?: string;
    transaction_reference?: string;
    total_amount: number;
    customer_name: string;
    meal_name: string;
    payment_notes?: string;
  };
  onConfirmPayment: (confirmed: boolean, notes: string) => Promise<void>;
}

export default function PaymentConfirmationModal({ 
  isOpen, 
  onClose, 
  order, 
  onConfirmPayment 
}: PaymentConfirmationModalProps) {
  const [isConfirmed, setIsConfirmed] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProof, setShowProof] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (isConfirmed === null) {
      toast.error('Please select whether to confirm or reject the payment');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmPayment(isConfirmed, notes);
      onClose();
    } catch (error) {
      console.error('Error confirming payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsConfirmed(null);
    setNotes('');
    setShowProof(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Payment Confirmation</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium ml-2">#{order.id}</span>
              </div>
              <div>
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium ml-2">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Meal:</span>
                <span className="font-medium ml-2">{order.meal_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium ml-2">₦{order.total_amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium ml-2 capitalize">{order.payment_method.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                  {order.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Proof Section */}
          {order.payment_method === 'bank_transfer' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Payment Proof</h3>
              
              {/* Transaction Reference */}
              {order.transaction_reference && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Transaction Reference:</span>
                    <span className="font-mono text-blue-900">{order.transaction_reference}</span>
                  </div>
                </div>
              )}

              {/* Payment Proof Image */}
              {order.payment_proof_url && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Payment Receipt:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowProof(!showProof)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{showProof ? 'Hide' : 'View'}</span>
                      </button>
                      <a
                        href={`http://localhost:8000${order.payment_proof_url}`}
                        download
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                  
                  {showProof && (
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={`http://localhost:8000${order.payment_proof_url}`} 
                        alt="Payment proof" 
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Confirmation Status */}
          {order.payment_confirmed_by_vendor && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Payment already confirmed</span>
              </div>
              {order.payment_notes && (
                <p className="text-green-700 text-sm mt-2">{order.payment_notes}</p>
              )}
            </div>
          )}

          {/* Confirmation Options */}
          {!order.payment_confirmed_by_vendor && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Confirm Payment</h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="confirmation"
                    value="confirm"
                    checked={isConfirmed === true}
                    onChange={() => setIsConfirmed(true)}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-900">Confirm Payment Received</span>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="confirmation"
                    value="reject"
                    checked={isConfirmed === false}
                    onChange={() => setIsConfirmed(false)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-gray-900">Reject Payment</span>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about the payment confirmation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {!order.payment_confirmed_by_vendor && (
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || isConfirmed === null}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Decision'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
