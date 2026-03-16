'use client';

import { useState } from 'react';
import { X, CreditCard, Banknote, CreditCard as CardIcon, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface CartItem {
  meal: {
    id: number;
    name: string;
    price: number;
    vendor: {
      id: number;
      name: string;
      bank_name?: string;
      account_number?: string;
      account_name?: string;
    };
  };
  quantity: number;
}

interface CheckoutPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalAmount: number;
  deliveryAddress: string;
  specialInstructions?: string;
  onConfirmOrder: (paymentMethod: 'cash_on_delivery' | 'bank_transfer', paymentProof?: File, transactionReference?: string) => void;
}

export default function CheckoutPaymentModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  totalAmount, 
  deliveryAddress, 
  specialInstructions, 
  onConfirmOrder 
}: CheckoutPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer'>('cash_on_delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setPaymentProof(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmOrder = async () => {
    if (paymentMethod === 'bank_transfer') {
      if (!paymentProof) {
        toast.error('Please upload payment proof for bank transfer');
        return;
      }
      
      if (!transactionReference.trim()) {
        toast.error('Please enter the transaction reference number');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConfirmOrder(paymentMethod, paymentProof || undefined, transactionReference || undefined);
      onClose();
    } catch (error) {
      console.error('Error confirming order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('cash_on_delivery');
    setPaymentProof(null);
    setTransactionReference('');
    setProofPreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Admin bank details (you can replace these with actual admin details)
  const adminBankDetails = {
    bank_name: "First Bank of Nigeria",
    account_number: "1234567890",
    account_name: "Khadijah Tastio"
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Complete Your Order</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}x {item.meal.name} (by {item.meal.vendor.name})
                  </span>
                  <span className="font-medium">₦{(item.meal.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span className="text-primary-600">₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Delivery Information</h4>
            <p className="text-sm text-blue-800 mb-1">{deliveryAddress}</p>
            {specialInstructions && (
              <p className="text-sm text-blue-800">
                <span className="font-medium">Special Instructions:</span> {specialInstructions}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash_on_delivery"
                  checked={paymentMethod === 'cash_on_delivery'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash_on_delivery' | 'bank_transfer')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div className="flex items-center space-x-2">
                  <Banknote className="h-5 w-5 text-gray-600" />
                  <span className="text-gray-900">Cash on Delivery</span>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash_on_delivery' | 'bank_transfer')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div className="flex items-center space-x-2">
                  <CardIcon className="h-5 w-5 text-gray-600" />
                  <span className="text-gray-900">Bank Transfer</span>
                </div>
              </label>
            </div>
          </div>

          {/* Bank Details (if bank transfer selected) */}
          {paymentMethod === 'bank_transfer' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Payment Bank Details</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Please transfer the total amount to the following account. We'll handle the distribution to vendors automatically.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Bank:</span>
                    <span className="font-medium">{adminBankDetails.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Account Number:</span>
                    <span className="font-medium">{adminBankDetails.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Account Name:</span>
                    <span className="font-medium">{adminBankDetails.account_name}</span>
                  </div>
                </div>
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {proofPreview && (
                    <div className="mt-2">
                      <img src={proofPreview} alt="Payment proof preview" className="max-w-xs rounded-lg border" />
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference Number
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Enter transaction reference"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span className="text-primary-600">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || (paymentMethod === 'bank_transfer' && (!paymentProof || !transactionReference.trim()))}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
