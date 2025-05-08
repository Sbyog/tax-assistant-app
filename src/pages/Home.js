import React, { useState, useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';

const Home = ({ isNewUser, user }) => {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Set appropriate welcome message
    if (isNewUser) {
      setWelcomeMessage(`Welcome ${user?.displayName || 'to AI Assistant'}! We're glad you're here.`);
    } else {
      setWelcomeMessage(`Welcome back, ${user?.displayName || 'friend'}!`);
    }
    
    // Hide welcome message after 5 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isNewUser, user]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-800">
      {showWelcome && (
        <div className="w-full py-3 text-center shadow-sm bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-center">
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="h-8 w-8 rounded-full mr-2 border-2 border-blue-400"
              />
            )}
            <h1 className="text-xl font-bold text-gray-700 dark:text-gray-200">
              {welcomeMessage}
            </h1>
          </div>
        </div>
      )}
      
      <div className="flex-grow w-full">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Home;
