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

  useEffect(() => {
    if (user && user.signUpDate) {
      const signUpDate = new Date(user.signUpDate);
      const now = new Date();
      const diffTime = Math.abs(now - signUpDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`Home.js: User signed up on: ${signUpDate}, Days since signup: ${diffDays}`);
      if (diffDays > 7) {
        setIsChatDisabled(true);
        console.log("Home.js: Chat disabled, trial period ended.");
      }
    } else {
      // If signUpDate is not available, default to not disabling chat
      // This might happen if user object is not fully loaded or for older users without this field
      console.warn("Home.js: signUpDate not found on user object. Chat will not be disabled by trial logic.");
      setIsChatDisabled(false);
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
      {isChatDisabled && (
        <div className="bg-red-500 text-white p-3 text-center">
          Your 7-day free trial has ended. Please subscribe to continue using the chat.
          {/* Add a button/link to subscription page here if available */}
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
