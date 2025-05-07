import React, { useState, useEffect } from 'react';
import { sendMessage } from '../api/chatApi';
import { auth } from '../firebase';

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
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setMessages([]);
      setThreadId(null);
      setError(null);
      if (!user) {
        setIsPanelOpen(false);
      } else {
        setIsPanelOpen(true); 
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
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(currentInput, threadId);
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
    }).catch(err => {
      console.error('Logout error:', err);
      setError('Failed to log out.');
    });
  };

  const dummyConversations = [
    { id: 1, title: 'Machine Learning Basics' },
    { id: 2, title: 'Recipe Ideas for Dinner' },
    { id: 3, title: 'Planning a Trip to Japan' },
    { id: 4, title: 'Python Code Debugging Help' },
    { id: 5, title: 'Understanding React Hooks' },
  ];

  return (
    <div className="flex h-full w-full bg-gray-200">
      {currentUser && isPanelOpen && (
        <div className="w-64 bg-gray-800 text-white p-4 flex flex-col rounded-l-lg shadow-xl">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold">History</h2>
            <button 
              onClick={() => setIsPanelOpen(false)} 
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700"
              aria-label="Close history panel"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto mb-4 space-y-1 pr-1">
            {dummyConversations.map(convo => (
              <div 
                key={convo.id} 
                className="p-2.5 hover:bg-gray-700 rounded-md cursor-pointer text-sm truncate"
                title={convo.title}
              >
                {convo.title}
              </div>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-md text-sm"
          >
            Logout
          </button>
        </div>
      )}

      <div className={`flex-1 flex flex-col bg-white text-black shadow-xl ${currentUser && isPanelOpen ? 'rounded-r-lg' : 'rounded-lg'}`}>
        <div className={`p-3 border-b flex items-center bg-gray-50 ${currentUser && isPanelOpen ? 'rounded-tr-lg' : 'rounded-t-lg'}`}>
          {currentUser && (
            <button 
              onClick={() => setIsPanelOpen(!isPanelOpen)} 
              className="mr-3 text-gray-600 hover:text-black p-1 rounded-md hover:bg-gray-200"
              aria-label={isPanelOpen ? "Close history panel" : "Open history panel"}
            >
              <MenuIcon />
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-700">AI Chat</h2>
        </div>
        
        <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-gray-100">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-2.5 rounded-xl shadow-md ${
                  msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'
                }`}
              >
                {typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (
                  <span key={i}>{line}{i !== msg.text.split('\n').length -1 && <br/>}</span>
                )) : JSON.stringify(msg.text)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2.5 rounded-xl bg-gray-300 text-gray-800 shadow-md animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center sticky top-2 z-10">
              <div className="w-full max-w-md p-3 rounded-lg bg-red-100 text-red-700 border border-red-300 shadow-lg text-sm">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
          {!currentUser && messages.length === 0 && !isLoading && (
             <div className="text-center text-gray-500 mt-10 flex flex-col items-center justify-center h-full">
                <p className="text-lg">Please log in to start a conversation.</p>
             </div>
          )}
        </div>
        
        <div className={`p-4 border-t bg-gray-50 ${currentUser && isPanelOpen ? 'rounded-br-lg' : 'rounded-b-lg'}`}>
          {!currentUser && (
            <p className="text-red-500 text-center mb-2 text-sm">Please log in to use the chat.</p>
          )}
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && currentUser && handleSend()}
                placeholder={currentUser ? "Type your message..." : "Log in to chat"}
                className="flex-grow px-4 py-2.5 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-100"
                disabled={isLoading || !currentUser}
              />
              <button
                onClick={handleSend}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-r-md disabled:opacity-50 shadow-sm"
                disabled={isLoading || !input.trim() || !currentUser}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
