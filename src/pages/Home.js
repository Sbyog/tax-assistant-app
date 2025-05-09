import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';

const Home = ({ isNewUser, user }) => {
  // Restore state variables for welcome message handling
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Set appropriate welcome message
    if (isNewUser) {
      setWelcomeMessage(`Welcome ${user?.displayName || 'to AI Assistant'}! We're glad you're here.`);
    } else {
      setWelcomeMessage(`Welcome back, ${user?.displayName || 'friend'}!`);
    }
    
    // Hide welcome message after 5 seconds (this state can be used by child components)
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isNewUser, user]);

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      {/* Header is kept hidden as requested */}
      <div className="flex-grow w-full flex flex-col">
        <ChatInterface 
          isNewUser={isNewUser} 
          user={user} 
          welcomeMessage={welcomeMessage}
          showWelcome={showWelcome}
        />
      </div>
    </div>
  );
};

export default Home;
