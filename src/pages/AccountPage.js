import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserData } from '../services/userService';
import { openCustomerPortal, checkSubscriptionStatus, createCheckoutSession } from '../services/paymentService';

const AccountPage = ({ user }) => {
  const [userData, setUserData] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null); // Internal status for color/button logic
  const [trialEndDate, setTrialEndDate] = useState(null); // Specifically for Stripe trial end date
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscriptionActionLoading, setIsSubscriptionActionLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // New states for UI display
  const [displayStatusLabel, setDisplayStatusLabel] = useState('Loading status...');
  const [displayDaysRemaining, setDisplayDaysRemaining] = useState(null);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        // setError(''); // Clear previous errors on new fetch
        // Initialize display states for loading phase handled by isLoading flag in JSX
        
        try {
          const uData = await getUserData(user.uid);
          setUserData(uData);

          const subStatus = await checkSubscriptionStatus(user.uid); // Stripe status

          let newDisplayStatusLabel = ''; 
          let newDisplayDaysRemaining = null;
          let internalStatusForStyling = 'error'; // Default for color and button logic

          let appTrialIsActive = false;
          if (uData && uData.subscriptionStatus === 'new' && uData.signUpDate) {
            const signUpDateObj = new Date(uData.signUpDate);
            const trialExpiryDate = new Date(signUpDateObj);
            trialExpiryDate.setDate(signUpDateObj.getDate() + 7);
            
            const appTrialDaysLeft = calculateDaysLeft(trialExpiryDate.toISOString());

            if (appTrialDaysLeft > 0) {
              newDisplayStatusLabel = '7-day Free Trial';
              newDisplayDaysRemaining = `(${appTrialDaysLeft} day${appTrialDaysLeft !== 1 ? 's' : ''} left)`;
              internalStatusForStyling = 'trialing'; // Mimic trialing for green color & button logic
              setTrialEndDate(null); // App trial overrides Stripe trial display details
              appTrialIsActive = true;
            }
          }

          if (!appTrialIsActive) {
            // App trial not active or not applicable, use Stripe's status
            if (subStatus.success) {
              internalStatusForStyling = subStatus.status;
              if (subStatus.status === 'trialing' && subStatus.trialEndDate) {
                newDisplayStatusLabel = '14-day free trial'; // Label for Stripe's trial
                const stripeDaysLeft = calculateDaysLeft(subStatus.trialEndDate);
                newDisplayDaysRemaining = `(${stripeDaysLeft} day${stripeDaysLeft !== 1 ? 's' : ''} left)`;
                setTrialEndDate(subStatus.trialEndDate); // Store Stripe's trial end date
              } else {
                newDisplayStatusLabel = (subStatus.status || 'N/A').toUpperCase();
                setTrialEndDate(null); // No active Stripe trial
              }
            } else {
              setError(subStatus.error || 'Failed to fetch subscription status.');
              newDisplayStatusLabel = 'ERROR';
              // internalStatusForStyling remains 'error'
            }
          }
          
          setSubscriptionStatus(internalStatusForStyling);
          setDisplayStatusLabel(newDisplayStatusLabel);
          setDisplayDaysRemaining(newDisplayDaysRemaining);

        } catch (err) {
          console.error("Error fetching account data:", err);
          setError('Failed to load account details.');
          setDisplayStatusLabel('ERROR');
          setDisplayDaysRemaining(null);
          setSubscriptionStatus('error');
          setTrialEndDate(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      // User is not available (e.g., logged out or not yet loaded)
      setIsLoading(false);
      setDisplayStatusLabel('N/A');
      setDisplayDaysRemaining(null);
      setSubscriptionStatus('none'); 
      setUserData(null);
      setTrialEndDate(null);
      setError('');
    }
  }, [user]); // calculateDaysLeft is stable and doesn't need to be a dependency

  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date(); // Current date is 9 May 2025 from context
    const diffTime = Math.max(end - now, 0); // Ensure no negative days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleManageSubscription = async () => {
    if (!userData || !userData.stripeCustomerId) {
      setError('Stripe customer ID not found. Cannot manage subscription.');
      return;
    }
    setIsSubscriptionActionLoading(true);
    setError('');
    try {
      const result = await openCustomerPortal(userData.stripeCustomerId);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || 'Could not open customer portal.');
      }
    } catch (err) {
      console.error("Error opening customer portal:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubscriptionActionLoading(false);
    }
  };

  const handleSubscribeNow = async () => {
    if (!user) {
      setError('You must be logged in to subscribe.');
      return;
    }
    setIsSubscriptionActionLoading(true);
    setError('');
    try {
      const result = await createCheckoutSession(); 
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || 'Failed to create checkout session.');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'An unexpected error occurred during subscription.');
    } finally {
      setIsSubscriptionActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // navigate('/login'); // Navigation handled by App.js onAuthStateChanged
    } catch (error) {
      console.error("Error signing out: ", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  if (isLoading && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          &larr; Back to Chat
        </button>

        <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Details</h1>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {userData ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                  <p className="text-lg text-gray-900 dark:text-white">{userData.displayName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-lg text-gray-900 dark:text-white">{userData.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription Status</p>
                  <p className={`text-lg font-semibold ${
                    isLoading ? 'text-gray-500 dark:text-gray-400' : // Color for loading state
                    subscriptionStatus === 'active' || subscriptionStatus === 'trialing' ? 'text-green-600 dark:text-green-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {isLoading ? 'Loading status...' : displayStatusLabel}
                    {!isLoading && displayDaysRemaining && (
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                        {displayDaysRemaining}
                      </span>
                    )}
                  </p>
                </div>

                {userData && userData.stripeCustomerId && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'past_due') && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={isSubscriptionActionLoading}
                    className="w-full sm:w-auto mt-4 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubscriptionActionLoading && userData.stripeCustomerId ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Manage Subscription'}
                  </button>
                )}

                {/* Show upgrade option for users on the 7-day free trial who don't have an active Stripe subscription */}
                {userData && userData.subscriptionStatus === 'new' && !isLoading && 
                  displayStatusLabel === '7-day Free Trial' && 
                  !userData.stripeCustomerId && 
                  !['active', 'trialing', 'past_due'].includes(subscriptionStatus) && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Enjoy your free trial! Upgrade now to ensure uninterrupted access.
                    </p>
                    <button
                      onClick={handleSubscribeNow}
                      disabled={isSubscriptionActionLoading}
                      className="w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isSubscriptionActionLoading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : 'Upgrade to Paid Plan'}
                    </button>
                  </div>
                )}

                {(!subscriptionStatus || ['none', 'canceled', 'incomplete', 'incomplete_expired', 'error', 'unpaid', 'paused'].includes(subscriptionStatus)) && !isLoading && (
                  <button
                    onClick={handleSubscribeNow}
                    disabled={isSubscriptionActionLoading}
                    className="w-full sm:w-auto mt-4 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubscriptionActionLoading ? (
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Subscribe Now'}
                  </button>
                )}
              </div>
            ) : (
              !isLoading && <p className="text-gray-700 dark:text-gray-300">Could not load user data.</p>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleSignOut}
                className="w-full sm:w-auto px-6 py-3 border border-red-500 text-base font-medium rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
