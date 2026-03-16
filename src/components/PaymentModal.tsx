'use client';

import { useState } from 'react';
import { X, CreditCard, Banknote, CreditCard as CardIcon, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onConfirmOrder: (paymentMethod: 'cash_on_delivery' | 'bank_transfer', quantity: number, paymentProof?: File, transactionReference?: string) => void;
}

export default function PaymentModal({ isOpen, onClose, meal, onConfirmOrder }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer'>('cash_on_delivery');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalAmount = meal.price * quantity;

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
      await onConfirmOrder(paymentMethod, quantity, paymentProof || undefined, transactionReference || undefined);
      onClose();
    } catch (error) {
      console.error('Error confirming order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('cash_on_delivery');
    setQuantity(1);
    setPaymentProof(null);
    setTransactionReference('');
    setProofPreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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
          {/* Meal Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{meal.name}</h3>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Price: ₦{meal.price.toLocaleString()}</span>
              <span>Vendor: {meal.vendor.name}</span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                -
              </button>
              <span className="text-lg font-medium w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                +
              </button>
            </div>
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
                    <span className="font-medium">First Bank of Nigeria</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Account Number:</span>
                    <span className="font-medium font-mono">1234567890</span>
                  </div>
                                     <div className="flex justify-between">
                     <span className="text-blue-700">Account Name:</span>
                     <span className="font-medium">Khadijah Tastio</span>
                   </div>
                </div>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference Number *
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Enter bank transfer reference"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the reference number from your bank transfer
                </p>
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof (Screenshot/Receipt) *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                    <div className="flex flex-col items-center space-y-2">
                      {proofPreview ? (
                        <img src={proofPreview} alt="Payment proof" className="h-20 w-auto object-contain" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload payment proof</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                  </label>
                  {paymentProof && (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">{paymentProof.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setPaymentProof(null);
                          setProofPreview(null);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a screenshot or photo of your payment receipt (Max 5MB)
                </p>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span className="text-primary-600">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmOrder}
            disabled={isSubmitting || 
              (paymentMethod === 'bank_transfer' && (
                !meal.vendor.bank_name || 
                !meal.vendor.account_number || 
                !meal.vendor.account_name ||
                !paymentProof ||
                !transactionReference.trim()
              ))
            }
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
