import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-bold tracking-tight text-gray-900">CampusFind</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome to CampusFind</h1>
        <p className="mt-4 text-lg text-gray-600">
          Report lost or found items, and let our AI engine match them for you.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/report?type=lost" className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition">
            <div className="px-4 py-5 sm:p-6 text-center hover:bg-gray-50">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Report Lost Item</h3>
              <div className="mt-2 text-sm text-gray-500">I lost something on campus.</div>
            </div>
          </Link>
          <Link to="/report?type=found" className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition">
            <div className="px-4 py-5 sm:p-6 text-center hover:bg-gray-50">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Report Found Item</h3>
              <div className="mt-2 text-sm text-gray-500">I found an item and want to return it.</div>
            </div>
          </Link>
          <Link to="/matches" className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition">
            <div className="px-4 py-5 sm:p-6 text-center hover:bg-gray-50">
              <h3 className="text-lg font-medium leading-6 text-gray-900">View Matches</h3>
              <div className="mt-2 text-sm text-gray-500">Check AI potential matches for your items.</div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
