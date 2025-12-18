import { useEffect } from 'react';

export default function DrawOfferModal({ from, onAccept, onDecline }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4 text-yellow-400">
            Draw Offer
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {from === 'white' ? 'White' : 'Black'} has offered a draw
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={onAccept}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Accept Draw
            </button>
            <button
              onClick={onDecline}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

