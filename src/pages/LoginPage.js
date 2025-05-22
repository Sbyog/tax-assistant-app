import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, sendSignInLinkToEmail } from "firebase/auth";

const LoginPage = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  
  const featuresData = [
    {
      title: "Chat for Instant Answers",
      description: "Just type your tax questions in a simple chat interface and receive immediate expert responses.",
      icon: "💬"
    },
    {
      title: "Conversational Guidance",
      description: "Have natural conversations about complicated tax rules and get clear, simple explanations.",
      icon: "🗣️"
    },
    {
      title: "Deduction Insights",
      description: "Discover potential deductions relevant to your personal or business situation.",
      icon: "💰"
    }
  ];

    // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((prevIndex) => (prevIndex + 1) % featuresData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="flex-grow flex flex-col md:flex-row w-full">
        {/* Left side - Content */}
        <div className="w-full md:w-3/5 p-6 md:p-10 lg:p-16 flex flex-col justify-center">
          <div className="animate-fadeIn">
            <div className="flex items-center mb-3">
              <span className="text-3xl md:text-4xl mr-2">🇦🇺</span>
              <h3 className="text-xl md:text-2xl font-bold text-blue-300 dark:text-blue-400">Australian Tax Expert</h3>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Chat with Your AI Tax <span className="text-yellow-400">Assistant</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-6 max-w-2xl">
              Simply ask questions and get instant answers about Australian tax laws. No complex forms or searches - just chat like you're texting a tax expert, available 24/7.
            </p>
            
            {/* Feature Highlights - Animated */}
            <div className="mb-8 bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <div className="transition-all duration-500 ease-in-out" key={featureIndex}>
                <div className="flex items-center mb-3">
                  <span className="text-2xl md:text-3xl mr-2 md:mr-3">{featuresData[featureIndex].icon}</span>
                  <h4 className="text-lg md:text-xl font-bold text-white">{featuresData[featureIndex].title}</h4>
                </div>
                <p className="text-sm md:text-base text-blue-100 pl-8 md:pl-12">{featuresData[featureIndex].description}</p>
              </div>
              <div className="flex justify-center mt-4">
                {featuresData.map((_, idx) => (
                  <button 
                    key={idx}
                    className={`h-2 w-2 rounded-full mx-1 ${idx === featureIndex ? 'bg-blue-400' : 'bg-white/30'}`} 
                    onClick={() => setFeatureIndex(idx)}
                    aria-label={`View feature ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <p className="text-sm md:text-base text-blue-100">
                <strong>Disclaimer:</strong> This chat-based AI assistant provides information about Australian tax laws but does not provide personalized tax advice. 
                For specific advice related to your situation, please consult a qualified tax professional.
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full md:w-2/5 p-6 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 md:p-10 w-full max-w-md backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90 relative z-10 border border-white/10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Start Chatting Now
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                New users enjoy a free 7-day chat trial!
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {emailSent && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
                <strong className="font-bold">Success! </strong>
                <span className="block sm:inline">A sign-in link has been sent to your email address. Please check your inbox.</span>
              </div>
            )}
            
            {/* Email signin first */}
            <form onSubmit={handleEmailLinkSignIn} className="mb-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                  required
                  disabled={isEmailLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isEmailLoading || isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 flex items-center justify-center transition-all duration-300"
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

            <div className="my-6 flex items-center">
              <hr className="flex-grow border-t border-gray-300 dark:border-gray-600"/>
              <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">OR</span>
              <hr className="flex-grow border-t border-gray-300 dark:border-gray-600"/>
            </div>

            {/* Google signin second */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-semibold py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 flex items-center justify-center transition-all duration-300"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-800 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-black/30 backdrop-blur-sm text-center p-4 text-sm text-gray-300">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2">
            <a href="https://cloudnext.dev" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 inline-flex items-center">
              Powered by CloudNext
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <div className="flex justify-center space-x-4 text-xs mt-2">
            <a href="/terms" className="text-gray-400 hover:text-gray-200">Terms of Use</a>
            <a href="/privacy" className="text-gray-400 hover:text-gray-200">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
