import React from 'react';
import ChatInterface from '../components/ChatInterface';

const Home = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-100"> {/* Occupy full height, flex column */}
      <div className="w-full py-3 text-center mb-4 shadow-sm bg-white"> {/* Header container, with slight adjustments */}
        <h1 className="text-xl font-bold text-gray-700"> {/* Slimmer header text */}
          AI Tools App
        </h1>
        {/* Subtitle removed for a cleaner look, can be added back if needed */}
      </div>
      <div className="flex-grow w-full"> {/* Wrapper for ChatInterface to grow */}
        <ChatInterface />
      </div>
    </div>
  );
};

export default Home;
