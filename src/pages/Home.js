import React from 'react';
import ChatInterface from '../components/ChatInterface'; // Import the ChatInterface

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8"> {/* Adjusted padding */}
      <div className="max-w-4xl mx-auto text-center mb-8"> {/* Added text-center and margin-bottom */}
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4"> {/* Adjusted text size and margin */}
          AI Tools App
        </h1>
        <p className="text-lg text-gray-600"> {/* Adjusted text size and color */}
          Welcome to the AI Tools App! Engage with our AI assistant below.
        </p>
      </div>
      <ChatInterface /> {/* Render the ChatInterface component */}
    </div>
  );
};

export default Home;
