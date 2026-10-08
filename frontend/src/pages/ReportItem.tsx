import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ReportForm } from '../components/ReportForm';
import { ArrowLeft } from 'lucide-react';

const ReportItem: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type') === 'found' ? 'found' : 'lost';

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Report {type === 'lost' ? 'Lost' : 'Found'} Item
          </h1>
          <p className="mt-2 text-gray-600">
            Please provide as much detail as possible to help our AI match this item.
          </p>
        </div>

        <div className="mt-8">
          <ReportForm defaultType={type} />
        </div>
      </div>
    </div>
  );
};

export default ReportItem;
