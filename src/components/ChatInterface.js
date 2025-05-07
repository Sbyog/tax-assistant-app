import React, { useState, useEffect } from 'react';
import { sendMessage } from '../api/chatApi';
import { auth } from '../firebase'; // Assuming you'll need auth for user identification

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      // Reset chat if user changes
      setMessages([]);
      setThreadId(null);
      setError(null);
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
        setMessages(prevMessages => prevMessages.filter(msg => msg !== userMessage)); // Remove user message if API call failed
      }
    } catch (err) {
      setError(err.message || 'An error occurred while sending the message.');
      setMessages(prevMessages => prevMessages.filter(msg => msg !== userMessage)); // Remove user message if API call failed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-2xl mx-auto bg-white shadow-xl rounded-lg">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">AI Chat</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
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
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-red-100 text-red-700">
              Error: {error}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t">
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
            className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  );
};

export default ChatInterface;
