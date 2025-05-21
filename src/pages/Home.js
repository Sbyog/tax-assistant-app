import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import TutorialModal from '../components/TutorialModal'; // Import the TutorialModal
import { getUserData, markTutorialAsCompleted } from '../services/userService'; // Import userService functions

const Home = ({ isNewUser, user }) => {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loadingTutorialState, setLoadingTutorialState] = useState(true);
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [trialMessage, setTrialMessage] = useState('');

  useEffect(() => {
    if (user && user.signUpDate && user.subscriptionStatus === 'new') {
      const signUpDate = new Date(user.signUpDate);
      const now = new Date();
      // Calculate difference in days, ensuring we count full days passed.
      // getTime() returns milliseconds. Difference is in milliseconds.
      const diffTime = now.getTime() - signUpDate.getTime(); 
      // Convert milliseconds to days: ms / (1000ms/s * 60s/min * 60min/hr * 24hr/day)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      console.log(`Home.js: User UID: ${user.uid}, Status: ${user.subscriptionStatus}, Signed up on: ${signUpDate.toISOString()}, Days since signup: ${diffDays}`);

      if (diffDays >= 7) {
        setIsChatDisabled(true);
        setTrialMessage("Your 7-day free trial has ended. Please subscribe to continue using the chat.");
        console.log("Home.js: Chat disabled, 7-day trial for 'new' user ended.");
      } else {
        setIsChatDisabled(false);
        const daysRemaining = 7 - diffDays;
        setTrialMessage(`You have ${daysRemaining} day(s) remaining in your free trial.`);
        console.log(`Home.js: Chat enabled, ${daysRemaining} day(s) remaining in trial for 'new' user.`);
      }
    } else if (user && user.subscriptionStatus !== 'new') {
      // If user is not 'new' (e.g., active, canceled), this specific trial logic doesn't apply.
      // Chat access would be determined by their actual subscription status via Stripe.
      setIsChatDisabled(false); // Assuming active subscribers or other statuses should have chat enabled.
      setTrialMessage(''); // No trial message for non-'new' or subscribed users.
      console.log(`Home.js: User UID: ${user.uid}, Status: ${user.subscriptionStatus}. Standard access, not governed by initial 7-day trial.`);
    } else {
      // Fallback or if user data is incomplete for this logic
      setIsChatDisabled(false); // Default to chat enabled if conditions aren't met for disabling
      setTrialMessage('');
      if (user) {
        console.warn(`Home.js: User UID: ${user.uid}. Could not determine trial status accurately. Defaulting to chat enabled. User data:`, user);
      } else {
        console.warn("Home.js: User object not available for trial status check.");
      }
    }

    if (isNewUser) {
      setWelcomeMessage(`Welcome ${user?.displayName}! I'm your tax bot and I can help you with your tax questions.`);
    } else {
      setWelcomeMessage(`Welcome back, ${user?.displayName || 'boss'}!`);
    }
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isNewUser, user]);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (user && user.uid) {
        setLoadingTutorialState(true);
        try {
          const userData = await getUserData(user.uid);
          if (isNewUser && (!userData || !userData.tutorialCompleted)) {
            setShowTutorial(true);
          }
        } catch (error) {
          console.error("Error checking tutorial status:", error);
        }
        setLoadingTutorialState(false);
      }
    };

    checkTutorialStatus();
  }, [user, isNewUser]);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    if (user && user.uid) {
      try {
        await markTutorialAsCompleted(user.uid);
        console.log('Tutorial marked as complete in Home.js');
      } catch (error) {
        console.error('Failed to mark tutorial as complete:', error);
      }
    }
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    handleTutorialComplete(); 
  };

  if (loadingTutorialState && isNewUser) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-100 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-300">Loading your experience...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      <TutorialModal 
        isOpen={showTutorial} 
        onClose={handleTutorialClose} 
        onComplete={handleTutorialComplete} 
      />
      {trialMessage && (
        <div className={`p-3 text-center text-white ${isChatDisabled ? 'bg-red-500' : 'bg-blue-500'}`}>
          {trialMessage}
          {/* Optionally, add a button/link to subscription page here if isChatDisabled is true */}
        </div>
      )}
      <div className="flex-grow w-full flex flex-col">
        <ChatInterface 
          isNewUser={isNewUser} 
          user={user} 
          welcomeMessage={welcomeMessage}
          showWelcome={showWelcome && !showTutorial} // Hide welcome message if tutorial is showing
          isChatDisabled={isChatDisabled} // Pass the disabled state to ChatInterface
        />
      </div>
    </div>
  );
};

export default Home;
