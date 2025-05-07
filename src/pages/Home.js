import React from 'react';
import ChatInterface from '../components/ChatInterface';

const Home = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-100"> {/* Occupy full height, flex column */}
      <div className="w-full py-3 text-center shadow-sm bg-white"> 
        <h1 className="text-xl font-bold text-gray-700">
          AI Tools App
        </h1>
      </div>
      <div className="flex-grow w-full"> {/* Wrapper for ChatInterface to grow */}
        <ChatInterface />
      </div>
    </div>
  );
};

export default Home;
