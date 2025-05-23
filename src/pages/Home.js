import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import TutorialModal from '../components/TutorialModal'; // Import the TutorialModal
import { getUserData, markTutorialAsCompleted } from '../services/userService'; // Import userService functions

const Home = ({ user, isNewUser, showWelcomeModal }) => {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loadingTutorialState, setLoadingTutorialState] = useState(true);
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [trialMessage, setTrialMessage] = useState('');

  useEffect(() => {
    console.log("Home.js useEffect: user prop:", user);
    if (user && user.subscriptionStatus === 'new' && user.signUpDate) {
      const now = new Date();
      const signUp = new Date(user.signUpDate);
      // Calculate difference in days, ignoring time component for day counting
      const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const utcSignUp = Date.UTC(signUp.getFullYear(), signUp.getMonth(), signUp.getDate());
      
      const diffTime = utcNow - utcSignUp; // Difference in milliseconds
      const daysSinceSignUp = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      console.log(`Home.js: Now: ${now.toISOString()}, SignUp: ${signUp.toISOString()}, Days since signup: ${daysSinceSignUp}`);

      if (daysSinceSignUp >= 7) {
        setIsChatDisabled(true);
        // Set trialMessage to empty or a specific expired message if needed by ChatInterface,
        // but for now, an empty message means it won't be displayed by the logic in ChatInterface.
        setTrialMessage(''); 
        console.log("Home.js: Trial expired. isChatDisabled: true");
      } else {
        setIsChatDisabled(false);
        const daysRemaining = 7 - daysSinceSignUp;
        setTrialMessage(`You have ${daysRemaining} day(s) remaining in your free trial.`);
        console.log(`Home.js: Trial active. Days remaining: ${daysRemaining}. isChatDisabled: false`);
      }
    } else {
      // Not a 'new' user or signUpDate is missing, so 7-day trial logic doesn't apply to disable chat via this mechanism.
      // Access will be governed by Stripe status or other rules.
      setIsChatDisabled(false); 
      setTrialMessage(''); // No specific trial message from this logic.
      if (user && user.subscriptionStatus !== 'new') {
        console.log("Home.js: User is not 'new'. isChatDisabled: false.");
      } else if (user && !user.signUpDate) {
        console.log("Home.js: User is 'new' but signUpDate is missing. isChatDisabled: false.");
      }
    }
  }, [user]);

  useEffect(() => {
    if (isNewUser) {
      setWelcomeMessage(`Welcome ${user?.displayName}! I'm Your MATE - your Mobile Australian Tax Expert - and I can help you with your tax questions.`);
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

  console.log(`Home.js Render: isChatDisabled=${isChatDisabled}, trialMessage="${trialMessage}"`);

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      <TutorialModal 
        isOpen={showTutorial} 
        onClose={handleTutorialClose} 
        onComplete={handleTutorialComplete} 
      />
      <div className="flex-grow w-full flex flex-col">
        <ChatInterface 
          isNewUser={isNewUser} 
          user={user} 
          welcomeMessage={welcomeMessage}
          showWelcome={showWelcome && !showTutorial} // Hide welcome message if tutorial is showing
          isChatDisabled={isChatDisabled} // Pass the disabled state to ChatInterface
          trialMessage={trialMessage}     // Pass the trial message string
        />
      </div>
    </div>
  );
};

export default Home;
