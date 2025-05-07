import React from 'react';
import ChatInterface from '../components/ChatInterface';

const Home = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-800"> {/* Occupy full height, flex column */}
      <div className="w-full py-3 text-center shadow-sm bg-white dark:bg-gray-900"> 
        <h1 className="text-xl font-bold text-gray-700 dark:text-gray-200">
          AI Tools
        </h1>
      </div>
      <div className="flex-grow w-full"> {/* Wrapper for ChatInterface to grow */}
        <ChatInterface />
      </div>
    </div>
  );
};

export default Home;
