import React, { useState, useEffect } from 'react';
import { sendMessage } from '../api/chatApi';
import { auth } from '../firebase';

// Simple icon for the toggle button (replace with a proper icon library if available)
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // State for panel visibility

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setMessages([]);
      setThreadId(null);
      setError(null);
      if (!user) {
        setIsPanelOpen(false); // Close panel if logged out
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!currentUser) {
      setError('You must be logged in to chat.');
      return;
    }

    const userMessage = { sender: 'user', text: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(input, threadId);
      if (response.success && response.data) {
        setThreadId(response.data.threadId);
        const botMessages = response.data.messages.map(msg => ({ sender: 'bot', text: msg }));
        setMessages(prevMessages => [...prevMessages, ...botMessages]);
      } else {
        setError(response.message || 'Failed to get a response from the AI.');
        setMessages(prevMessages => prevMessages.filter(msg => msg !== userMessage));
      }
    } catch (err) {
      setError(err.message || 'An error occurred while sending the message.');
      setMessages(prevMessages => prevMessages.filter(msg => msg !== userMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      console.log('User logged out');
      // State will be reset by onAuthStateChanged
    }).catch(error => {
      console.error('Logout error:', error);
      setError('Failed to log out.');
    });
  };

  // Dummy conversations
  const dummyConversations = [
    { id: 1, title: 'Machine Learning Basics' },
    { id: 2, title: 'Recipe Ideas' },
    { id: 3, title: 'Travel to Japan' },
    { id: 4, title: 'Python Code Help' },
  ];

  return (
    <div className="flex h-[calc(100vh-150px)] max-w-full mx-auto bg-gray-800 text-white shadow-xl rounded-lg">
      {/* Left Panel */}
      {currentUser && isPanelOpen && (
        <div className="w-64 bg-gray-700 p-4 flex flex-col rounded-l-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">History</h2>
            <button onClick={() => setIsPanelOpen(false)} className="text-gray-400 hover:text-white">
              <CloseIcon />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto mb-4">
            {dummyConversations.map(convo => (
              <div key={convo.id} className="p-2 hover:bg-gray-600 rounded cursor-pointer text-sm truncate">
                {convo.title}
              </div>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white text-black rounded-r-lg">
        <div className="p-3 border-b flex items-center">
          {currentUser && (
            <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="mr-3 text-gray-600 hover:text-black">
              <MenuIcon />
            </button>
          )}
          <h2 className="text-lg font-semibold">AI Chat</h2> {/* Header size reduced */}
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-2 bg-gray-50">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-2xl px-4 py-2 rounded-lg shadow ${
                  msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (
                  <span key={i}>{line}<br/></span>
                )) : JSON.stringify(msg.text)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800 shadow">
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="max-w-md px-4 py-2 rounded-lg bg-red-100 text-red-700 border border-red-300 shadow">
                Error: {error}
              </div>
            </div>
          )}
          {!currentUser && messages.length === 0 && (
             <div className="text-center text-gray-500 mt-10">
                Please log in to start a conversation.
             </div>
          )}
        </div>
        <div className="p-4 border-t bg-white">
          {!currentUser && (
            <p className="text-red-500 text-center mb-2">Please log in to use the chat.</p>
          )}
          <div className="flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && currentUser && handleSend()}
              placeholder={currentUser ? "Type your message..." : "Log in to chat"}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !currentUser}
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md disabled:opacity-50"
              disabled={isLoading || !input.trim() || !currentUser}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
