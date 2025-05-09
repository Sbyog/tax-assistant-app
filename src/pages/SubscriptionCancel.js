import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any pending signup details from local storage as the user cancelled
    localStorage.removeItem('signupFirstName');
    localStorage.removeItem('signupLastName');
    localStorage.removeItem('signupEmail');
    localStorage.removeItem('signupUid');
    localStorage.removeItem('signupPhotoURL');

    // Sign out the user and redirect to login page
    auth.signOut().then(() => {
      console.log('User signed out due to subscription cancellation.');
      navigate('/login');
    }).catch(error => {
      console.error('Error signing out user:', error);
      // Still navigate to login even if signout fails for some reason
      navigate('/login');
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
      <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg p-8 md:p-12 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-primary mb-4">Subscription Cancelled</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your subscription process was cancelled. You are being redirected to the login page.
        </p>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto my-4"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
          Redirecting...
        </p>
      </div>
    </div>
  );
};

export default SubscriptionCancel;