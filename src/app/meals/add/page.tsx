'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  ChefHat,
  Upload,
  X
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import tokenManager from '@/utils/tokenManager';
import { getErrorMessage } from '@/utils/errorUtils';

interface MealFormData {
  name: string;
  description: string;
  price: number;
  availability: boolean;
  image?: File;
}

export default function MealAddPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<MealFormData>({
    defaultValues: {
      availability: true
    }
  });

  const availability = watch('availability');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Set the file in the form
      setValue('image', file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    setValue('image', undefined);
  };

  const onSubmit = async (data: MealFormData) => {
    try {
      setIsSaving(true);
      const token = tokenManager.getToken();
      
      if (!token) {
        toast.error('Authentication required');
        router.push('/login');
        return;
      }

      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('price', data.price.toString());
      formData.append('availability', data.availability.toString());
      
      if (data.image) {
        formData.append('image', data.image);
      }

      const response = await fetch('http://localhost:8000/api/meals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('Meal created successfully!');
        router.push('/meals');
      } else {
        const error = await response.json();
        throw new Error(getErrorMessage(error));
      }
    } catch (error) {
      console.error('Error creating meal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create meal');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/meals"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Meals
            </Link>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <ChefHat className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Add New Meal
              </h1>
              <p className="text-gray-600">
                Create a new meal offering for your customers
              </p>
            </div>
          </div>
        </div>

        {/* Meal Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Meal Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Image
              </label>
              <div className="space-y-4">
                {previewImage && (
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Meal preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Meal Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Meal Name
              </label>
              <input
                type="text"
                id="name"
                {...register('name', { 
                  required: 'Meal name is required',
                  minLength: {
                    value: 2,
                    message: 'Meal name must be at least 2 characters'
                  }
                })}
                className="input-field"
                placeholder="Enter meal name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                {...register('description', { 
                  required: 'Description is required',
                  minLength: {
                    value: 10,
                    message: 'Description must be at least 10 characters'
                  }
                })}
                className="input-field"
                placeholder="Describe your meal, ingredients, and cooking style..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (₦)
              </label>
              <input
                type="number"
                id="price"
                step="0.01"
                min="0"
                {...register('price', { 
                  required: 'Price is required',
                  min: {
                    value: 0,
                    message: 'Price must be positive'
                  }
                })}
                className="input-field"
                placeholder="0.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>

            {/* Availability */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('availability')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 block text-sm text-gray-900">
                  Available for orders
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                {availability 
                  ? 'This meal will be visible to customers and available for ordering.'
                  : 'This meal will be hidden from customers and unavailable for ordering.'
                }
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/meals"
                className="btn-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Creating...' : 'Create Meal'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
