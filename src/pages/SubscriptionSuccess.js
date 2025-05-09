import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkIfUserExists, updateUserLastLogin } from '../services/userService';
import { checkSubscriptionStatus } from '../services/paymentService';
import { auth } from '../firebase';

const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLS = 5; // Max 5 attempts (10 seconds total)

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your account and subscription...');
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const clearLocalStorageSignupDetails = useCallback(() => {
    localStorage.removeItem('signupFirstName');
    localStorage.removeItem('signupLastName');
    localStorage.removeItem('signupEmail');
    localStorage.removeItem('signupUid');
    localStorage.removeItem('signupPhotoURL');
    console.log('Cleared signup details from localStorage.');
  }, []);

  useEffect(() => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      setError('User not authenticated. Please log in.');
      clearLocalStorageSignupDetails();
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const verifyUserAndSubscription = async () => {
      setStatus('Checking account status...');
      try {
        const userExists = await checkIfUserExists(firebaseUser.uid);

        if (userExists) {
          console.log('User found in Firestore. Proceeding to check subscription.');
          setStatus('Account verified. Checking subscription status...');
          const subStatus = await checkSubscriptionStatus(firebaseUser.uid);

          if (subStatus.success && (subStatus.status === 'active' || subStatus.status === 'trialing')) {
            setStatus('Subscription confirmed! Redirecting to your dashboard...');
            await updateUserLastLogin(firebaseUser.uid);
            clearLocalStorageSignupDetails();
            setTimeout(() => navigate('/'), 2000);
          } else {
            setError(`Subscription not active (${subStatus.status || 'unknown'}). Please contact support if this is an error.`);
            clearLocalStorageSignupDetails();
            setTimeout(() => navigate('/account'), 4000); // Or login, depending on desired flow for failed sub check
          }
        } else {
          // User does not exist, poll a few times
          if (pollCount < MAX_POLLS) {
            setStatus(`Account not yet found. Retrying... (${pollCount + 1}/${MAX_POLLS})`);
            setPollCount(prev => prev + 1);
            // setTimeout will be handled by pollCount change re-triggering useEffect
          } else {
            setError('Failed to verify your account setup after checkout. Your payment may have succeeded, but account creation failed. Please contact support.');
            clearLocalStorageSignupDetails();
            // Sign out user before redirecting to login to ensure a clean state
            auth.signOut().then(() => {
                navigate('/login');
            }).catch(err => {
                console.error("Error signing out after account verification failure:", err);
                navigate('/login'); // Still navigate
            });
          }
        }
      } catch (err) {
        console.error('Error during user/subscription verification:', err);
        setError(`Error: ${err.message}. Please contact support.`);
        clearLocalStorageSignupDetails();
        // Optional: sign out and redirect to login on critical errors
        auth.signOut().then(() => {
            navigate('/login');
        }).catch(signOutErr => {
            console.error("Error signing out after critical verification error:", signOutErr);
            navigate('/login');
        });
      }
    };

    // Initial call or if pollCount changes
    const timerId = setTimeout(verifyUserAndSubscription, pollCount > 0 ? POLLING_INTERVAL : 0);

    return () => clearTimeout(timerId); // Cleanup timer

  }, [navigate, pollCount, clearLocalStorageSignupDetails]); // Effect dependencies

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
      <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg p-8 md:p-12 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-primary mb-6">Finalizing Setup</h1>
        {error ? (
          <div className="text-red-500 dark:text-red-400 mb-4">
            <p className="font-semibold">Verification Error:</p>
            <p>{error}</p>
            {error.includes("contact support") && 
              <p className="mt-2 text-sm">You will be redirected to the login page.</p>
            }
          </div>
        ) : (
          <div className="text-green-600 dark:text-green-400 mb-4">
            <p>{status}</p>
          </div>
        )}
        {!error && (
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto my-4"></div>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
          Please wait while we complete your setup. You will be redirected shortly.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;