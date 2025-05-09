import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserData } from '../services/userService';
import { openCustomerPortal, checkSubscriptionStatus, createCheckoutSession } from '../services/paymentService';

const AccountPage = ({ user }) => {
  const [userData, setUserData] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [trialEndDate, setTrialEndDate] = useState(null); // Added to store trial end date
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscriptionActionLoading, setIsSubscriptionActionLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const uData = await getUserData(user.uid);
          setUserData(uData);
          
          const subStatus = await checkSubscriptionStatus(user.uid);
          if (subStatus.success) {
            setSubscriptionStatus(subStatus.status);
            if (subStatus.status === 'trialing' && subStatus.trialEndDate) {
              setTrialEndDate(subStatus.trialEndDate);
            } else {
              setTrialEndDate(null);
            }
          } else {
            setError(subStatus.error || 'Failed to fetch subscription status.');
            setSubscriptionStatus('error');
            setTrialEndDate(null);
          }
        } catch (err) {
          console.error("Error fetching account data:", err);
          setError('Failed to load account details.');
          setSubscriptionStatus('error');
          setTrialEndDate(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

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
      navigate('/login');
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
                    isLoading && !subscriptionStatus ? 'text-gray-500 dark:text-gray-400' :
                    subscriptionStatus === 'active' || subscriptionStatus === 'trialing' ? 'text-green-600 dark:text-green-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {isLoading && !subscriptionStatus ? 'Loading status...' : 
                      subscriptionStatus === 'trialing' ? '14-day free trial' :
                      (subscriptionStatus || 'N/A').toUpperCase()}
                    {subscriptionStatus === 'trialing' && trialEndDate && (
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                        ({calculateDaysLeft(trialEndDate)} days left)
                      </span>
                    )}
                  </p>
                </div>

                {userData.stripeCustomerId && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'past_due') && (
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

                {(!subscriptionStatus || subscriptionStatus === 'none' || subscriptionStatus === 'canceled' || subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired' || subscriptionStatus === 'error') && !isLoading && (
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
