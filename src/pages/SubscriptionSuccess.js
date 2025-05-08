import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const SubscriptionSuccess = () => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        navigate('/login');
      }
    });
    
    // Redirect after countdown
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Subscription Successful!
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Thank you for subscribing to our premium service. Your account has been upgraded and you now have access to all premium features.
        </p>
        
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Redirecting to home page in {countdown} seconds...
        </p>
        
        <Link 
          to="/" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-all"
        >
          Go to Home Now
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;