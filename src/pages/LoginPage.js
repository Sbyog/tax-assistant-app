import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, sendSignInLinkToEmail } from "firebase/auth";

const LoginPage = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // On successful sign-in, Firebase's onAuthStateChanged will handle the redirect
      // or state update in App.js, so no need to navigate from here.
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLinkSignIn = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setIsEmailLoading(true);
    setError(null);
    setEmailSent(false);

    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) for this
      // URL must be whitelisted in the Firebase Console.
      url: window.location.origin + '/__/auth/action', // Changed to a specific callback path
      handleCodeInApp: true, // This must be true.
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save the email locally so you don't need to ask the user for it again
      // if they open the link on the same device.
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
      setError(null);
    } catch (err) {
      console.error("Email Link Sign-In Error:", err);
      setError(err.message || 'Failed to send sign-in link. Please try again.');
      setEmailSent(false);
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
      <div className="bg-white dark:bg-gray-700 shadow-xl rounded-lg p-8 md:p-12 w-full max-w-md text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6 dark:text-white">
          I'm Your Tax Bot
        </h1>
        <h2  className="text-lg md:text-lg font-bold text-gray-600 mb-6 dark:text-white">
        Your personal tax assistant with extensive knowledge of Australian tax laws.
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Please sign in to continue.
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {emailSent && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Success! </strong>
            <span className="block sm:inline">A sign-in link has been sent to your email address. Please check your inbox.</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.999,36.096,44,30.666,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
          )}
          Sign in with Google
        </button>

        <div className="my-6 flex items-center">
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-500"/>
          <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">OR</span>
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-500"/>
        </div>

        <form onSubmit={handleEmailLinkSignIn}>
          <div className="mb-4">
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-600 dark:text-white"
              required
              disabled={isEmailLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isEmailLoading || isLoading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 flex items-center justify-center"
          >
            {isEmailLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
            Sign in with Email Link
          </button>
        </form>
        
      </div>
    </div>
  );
};

export default LoginPage;
