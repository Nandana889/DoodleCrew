import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Matches: React.FC = () => {
  const { session } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleClaim = async (matchId: string) => {
    const proof = prompt('Please provide distinct proof of ownership for this item:');
    if (!proof) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ match_id: matchId, proof_text: proof })
      });
      if (!response.ok) throw new Error('Failed to submit claim.');
      alert('Claim submitted for verification!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const fetchMatches = async () => {
      // The backend AI engine creates matches in the database.
      // Thanks to RLS, the user will only see matches related to their own items.
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          similarity_score,
          explanation,
          status,
          created_at,
          lost_item:lost_item_id(title, category, location),
          found_item:found_item_id(title, category, location)
        `)
        .order('similarity_score', { ascending: false });

      if (data) setMatches(data);
      setLoading(false);
    };

    fetchMatches();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your AI Matches</h1>
          <p className="mt-2 text-gray-600">
            Items that our system thinks might belong together.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 text-center text-gray-500">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="mt-8 text-center text-gray-500 bg-white p-12 rounded-lg shadow">
            No matches found yet. The AI is still searching!
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {matches.map(match => (
              <div key={match.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      {Math.round(match.similarity_score)}% Match Confidence
                    </span>
                    <h3 className="mt-4 text-lg font-medium">Lost: {match.lost_item?.title}</h3>
                    <h3 className="text-lg font-medium text-gray-700">Found: {match.found_item?.title}</h3>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    Status: <span className="capitalize font-semibold">{match.status}</span>
                  </div>
                </div>
                
                <div className="mt-4 bg-blue-50 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-900">AI Explanation:</h4>
                  <p className="mt-1 text-blue-800 text-sm">{match.explanation}</p>
                </div>
                
                {match.status === 'pending' && (
                  <div className="mt-6 flex space-x-3">
                    <button 
                      onClick={() => handleClaim(match.id)}
                      className="rounded bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800"
                    >
                      Claim Item / Verify Ownership
                    </button>
                    <button className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 font-medium hover:bg-gray-300">
                      Not a match
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
