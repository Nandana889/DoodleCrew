import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const reportSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().min(3, 'Title is too short'),
  description: z.string().min(10, 'Please provide more details'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  approximate_time: z.string().min(1, 'Time is required'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export const ReportForm: React.FC<{ defaultType: 'lost' | 'found' }> = ({ defaultType }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: defaultType,
      category: 'electronics'
    }
  });

  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: ReportFormValues) => {
    setLoading(true);
    try {
      // POST to backend API to trigger AI matching securely
      const response = await fetch('http://localhost:5000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit report. Please check if your database schema has been executed.');
      }
      
      alert('Report submitted successfully! The AI is analyzing matches now.');
      navigate('/matches');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg bg-white p-8 shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select {...register('type')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
          <option value="lost">I lost this item</option>
          <option value="found">I found this item</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input type="text" {...register('title')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="e.g. Blue Hydroflask" />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea {...register('description')} rows={4} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Provide distinct physical details..." />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select {...register('category')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
          <option value="electronics">Electronics & Devices</option>
          <option value="accessories">Bags & Accessories</option>
          <option value="clothing">Clothing</option>
          <option value="stationery">Stationery & Books</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input type="text" {...register('location')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="e.g. Library 2nd Floor" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Approximate Time</label>
        <input type="datetime-local" {...register('approximate_time')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
      </div>

      <button type="submit" disabled={loading} className="w-full flex justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
};
