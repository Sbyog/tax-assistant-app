import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserInFirestore, updateUserLastLogin } from '../services/userService'; // Corrected path
import { checkSubscriptionStatus } from '../services/paymentService'; // Corrected path
import { auth } from '../firebase'; // Corrected path

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your subscription...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processSubscription = async () => {
      const firebaseUser = auth.currentUser;
      const storedFirstName = localStorage.getItem('signupFirstName');
      const storedLastName = localStorage.getItem('signupLastName');
      const storedEmail = localStorage.getItem('signupEmail');
      const storedUid = localStorage.getItem('signupUid');
      const storedPhotoURL = localStorage.getItem('signupPhotoURL');

      if (!firebaseUser) {
        setError('User not authenticated. Please log in.');
        // Clear local storage as we can't proceed
        localStorage.removeItem('signupFirstName');
        localStorage.removeItem('signupLastName');
        localStorage.removeItem('signupEmail');
        localStorage.removeItem('signupUid');
        localStorage.removeItem('signupPhotoURL');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Check if this is a new user completing signup
      if (storedUid === firebaseUser.uid && storedFirstName && storedLastName && storedEmail) {
        setStatus('Finalizing your account setup...');
        try {
          const userToCreate = {
            uid: storedUid,
            email: storedEmail,
            displayName: `${storedFirstName} ${storedLastName}`.trim(),
            photoURL: storedPhotoURL || ''
          };
          await createUserInFirestore(userToCreate);
          console.log('User created in Firestore after successful subscription.');
          
          // Clear local storage items now that user is created
          localStorage.removeItem('signupFirstName');
          localStorage.removeItem('signupLastName');
          localStorage.removeItem('signupEmail');
          localStorage.removeItem('signupUid');
          localStorage.removeItem('signupPhotoURL');

          // Now verify subscription status
          setStatus('Verifying subscription status...');
          const subStatus = await checkSubscriptionStatus(firebaseUser.uid);
          if (subStatus.success && (subStatus.status === 'active' || subStatus.status === 'trialing')) {
            setStatus('Subscription confirmed! Redirecting to your dashboard...');
            await updateUserLastLogin(firebaseUser.uid); // Update last login
            setTimeout(() => navigate('/'), 2000); 
          } else {
            setError(`Subscription not active (${subStatus.status}). Please contact support if this is an error.`);
            // Potentially sign out or offer to go to account page
            setTimeout(() => navigate('/account'), 4000);
          }
        } catch (err) {
          console.error('Error during post-subscription user creation or check:', err);
          setError(`Error: ${err.message}. Please contact support.`);
          // Clear local storage on error to prevent loops
          localStorage.removeItem('signupFirstName');
          localStorage.removeItem('signupLastName');
          localStorage.removeItem('signupEmail');
          localStorage.removeItem('signupUid');
          localStorage.removeItem('signupPhotoURL');
        }
      } else {
        // This is likely an existing user who re-subscribed or managed their subscription.
        // Or, somehow landed here without the signup local storage variables.
        setStatus('Verifying your subscription status...');
        try {
          const subStatus = await checkSubscriptionStatus(firebaseUser.uid);
          if (subStatus.success && (subStatus.status === 'active' || subStatus.status === 'trialing')) {
            setStatus('Subscription confirmed! Redirecting...');
            await updateUserLastLogin(firebaseUser.uid); // Update last login
            setTimeout(() => navigate('/'), 2000);
          } else {
            setError(`Subscription not active (${subStatus.status}). Please contact support or check your account.`);
            setTimeout(() => navigate('/account'), 4000);
          }
        } catch (err) {
          console.error('Error checking subscription for existing user:', err);
          setError(`Error: ${err.message}. Please try again or contact support.`);
        }
      }
    };

    processSubscription();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
      <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg p-8 md:p-12 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-primary mb-6">Subscription Status</h1>
        {error ? (
          <div className="text-red-500 dark:text-red-400 mb-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
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
          You will be redirected shortly.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;