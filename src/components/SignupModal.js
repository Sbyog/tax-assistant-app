import React, { useState, useEffect } from 'react';
import { createCheckoutSession } from '../services/paymentService';
import { auth } from '../firebase';

const SignupModal = ({ user, onCancel, setPendingSignupDetails }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      const parts = user.displayName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  const handleSignupTrial = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last names.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Store names and other relevant user info for after Stripe redirect
      localStorage.setItem('signupFirstName', firstName.trim());
      localStorage.setItem('signupLastName', lastName.trim());
      localStorage.setItem('signupEmail', user.email);
      localStorage.setItem('signupUid', user.uid);
      localStorage.setItem('signupPhotoURL', user.photoURL || '');

      // Pass firstName and lastName to createCheckoutSession
      const result = await createCheckoutSession(firstName.trim(), lastName.trim());
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || 'Failed to start trial. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error during trial signup:', err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear any potentially stored signup details from localStorage
    localStorage.removeItem('signupFirstName');
    localStorage.removeItem('signupLastName');
    localStorage.removeItem('signupEmail');
    localStorage.removeItem('signupUid');
    localStorage.removeItem('signupPhotoURL');

    auth.signOut().then(() => {
      setPendingSignupDetails(null); // Clear pending details in App.js
      if (onCancel) onCancel(); // Propagate cancel if needed elsewhere
    }).catch(err => {
      console.error("Error signing out on cancel:", err);
      // Still clear pending details even if signout fails for some reason
      setPendingSignupDetails(null);
      if (onCancel) onCancel();
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-md w-full transform transition-all">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">Complete Your Sign Up</h2>
        
        {user?.photoURL && (
          <div className="mb-4">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="h-20 w-20 rounded-full mx-auto border-2 border-blue-400"
              onError={(e) => e.target.parentElement.style.display = 'none'}
            />
          </div>
        )}
        <p className="text-center text-gray-600 dark:text-gray-300 mb-1">
          Welcome, {user?.email}!
        </p>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          Please confirm your name to start your free trial.
        </p>

        <form onSubmit={handleSignupTrial}>
          <div className="mb-4">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
              required
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full sm:w-auto flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-2.5 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Sign up for a free trial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
