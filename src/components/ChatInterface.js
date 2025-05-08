import React, { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../api/chatApi';
import { auth } from '../firebase';
import { getUserData } from '../services/userService';
import { createCheckoutSession, openCustomerPortal, checkSubscriptionStatus } from '../services/paymentService';

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

const WelcomeModal = ({ onClose, user }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 transform transition-all">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="h-10 w-10 rounded-full mr-3 border-2 border-blue-400"
              />
            )}
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              Welcome, {user?.displayName || 'New User'}!
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4 text-gray-600 dark:text-gray-300 space-y-3">
          <p>Thank you for joining our AI assistant platform! This application allows you to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Chat with our advanced AI assistant</li>
            <li>Get intelligent responses to your questions</li>
            <li>Maintain conversation history for future reference</li>
            <li>Upload documents for AI-powered analysis (premium feature)</li>
          </ul>
          <p className="pt-2">We're excited to have you here and hope our assistant makes your tasks easier and more efficient.</p>
        </div>
        
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = ({ isNewUser, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const localTheme = window.localStorage.getItem('theme');
      return localTheme || 'light';
    }
    return 'light';
  });
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('unknown'); // 'unknown', 'active', 'inactive'
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setMessages([]);
      setThreadId(null);
      setError(null);
      if (!user) {
        setIsPanelOpen(false);
        setSubscriptionStatus('unknown');
        setUserData(null);
      } else {
        setIsPanelOpen(true);
        fetchUserData(user.uid);
        checkUserSubscription(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const data = await getUserData(userId);
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const checkUserSubscription = async (userId) => {
    setSubscriptionLoading(true);
    try {
      const result = await checkSubscriptionStatus(userId);
      if (result.success) {
        setSubscriptionStatus(result.status === 'active' ? 'active' : 'inactive');
      } else {
        setSubscriptionStatus('inactive');
        console.error('Error checking subscription:', result.error);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus('inactive');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSubscriptionClick = async () => {
    setSubscriptionLoading(true);
    try {
      if (subscriptionStatus === 'active' && userData?.stripeCustomerId) {
        const result = await openCustomerPortal(userData.stripeCustomerId);
        if (result.success) {
          window.location.href = result.url;
        } else {
          console.error('Error opening customer portal:', result.error);
          setError('Failed to open subscription management. Please try again.');
        }
      } else {
        const result = await createCheckoutSession();
        if (result.success) {
          window.location.href = result.url;
        } else {
          console.error('Error creating checkout session:', result.error);
          setError('Failed to start subscription process. Please try again.');
        }
      }
    } catch (error) {
      console.error('Subscription action error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (isNewUser) {
        setShowModal(true);
      } else {
        setShowWelcomeMessage(true);
        const timer = setTimeout(() => {
          setShowWelcomeMessage(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isNewUser]);

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
        
        const newBotMessageTextsFromApi = response.data.messages;

        setMessages(prevMsgs => {
          const botMessagesAlreadyInState = prevMsgs.filter(m => m.sender === 'bot');
          const existingBotTexts = new Set(botMessagesAlreadyInState.map(m => m.text));
          
          const trulyNewTexts = newBotMessageTextsFromApi.filter(text => !existingBotTexts.has(text));
          
          const finalBotMessageObjects = trulyNewTexts.map(msg => ({ sender: 'bot', text: msg }));

          if (newBotMessageTextsFromApi.length > 0 && finalBotMessageObjects.length === 0) {
            console.warn("API returned message(s), but all were apparent duplicates of existing bot messages.", newBotMessageTextsFromApi);
          }
          
          return [...prevMsgs, ...finalBotMessageObjects];
        });

      } else {
        setError(response.message || 'Failed to get a response from the AI.');
        setMessages(prevMsgs => prevMsgs.filter(msg => msg !== userMessage));
      }
    } catch (err) {
      console.error('Error in handleSend:', err);
      setError(err.message || 'An error occurred while sending the message.');
      setMessages(prevMsgs => prevMsgs.filter(msg => msg !== userMessage));
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

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <>
      <div className="flex h-full w-full bg-gray-200 dark:bg-gray-900">
        {currentUser && isPanelOpen && (
          <div className="w-64 bg-slate-100 text-slate-800 dark:bg-gray-800 dark:text-slate-200 p-4 flex flex-col rounded-l-lg shadow-xl">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-lg font-semibold">History</h2>
              <button 
                onClick={() => setIsPanelOpen(false)} 
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700"
                aria-label="Close history panel"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mb-4 mt-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-gray-600 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
              >
                {theme === 'light' ? 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path fillRule='evenodd' d='M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.516a.75.75 0 01.808.488z' clipRule='evenodd' /></svg>Switch to Dark</span> : 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path d='M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 14.596a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06zM5.404 5.404a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06z' /></svg>Switch to Light</span>}
              </button>
            </div>

            <div className="flex-grow overflow-y-auto mb-4 space-y-1 pr-1">
              {dummyConversations.map(convo => (
                <div 
                  key={convo.id} 
                  className="p-2.5 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-md cursor-pointer text-sm truncate"
                  title={convo.title}
                >
                  {convo.title}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubscriptionClick}
              disabled={subscriptionLoading}
              className={`w-full mb-3 py-2.5 px-4 rounded-md text-sm font-medium flex items-center justify-center ${
                subscriptionStatus === 'active'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
              } transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:opacity-70`}
            >
              {subscriptionLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : subscriptionStatus === 'active' ? (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Manage Subscription
                </span>
              ) : (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Subscribe Now • $10/month
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        )}

        <div className={`flex-1 relative bg-white text-black dark:bg-gray-800 dark:text-white shadow-xl ${currentUser && isPanelOpen ? 'rounded-r-lg' : 'rounded-lg'}`}>
          <div className={`absolute top-0 left-0 right-0 z-10 p-3 border-b flex items-center bg-gray-50 dark:bg-gray-700 ${currentUser && isPanelOpen ? 'rounded-tr-lg' : 'rounded-t-lg'}`}>
            <div className="flex items-center flex-1">
              {currentUser && (
                <button 
                  onClick={() => setIsPanelOpen(!isPanelOpen)} 
                  className="mr-3 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label={isPanelOpen ? "Close history panel" : "Open history panel"}
                >
                  <MenuIcon />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">AI Chat</h2>
            </div>
            
            {showWelcomeMessage && !isNewUser && (
              <div className="text-right text-gray-700 dark:text-gray-200 font-medium animate-fade-in">
                {user && (
                  <div className="flex items-center">
                    <span>Welcome back, {user.displayName?.split(' ')[0] || 'friend'}!</span>
                    {user.photoURL && (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="h-6 w-6 rounded-full ml-2 border border-blue-400"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="absolute top-[53px] bottom-[76px] left-0 right-0 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-3xl mx-auto flex flex-col space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-2.5 rounded-xl shadow-md ${
                      msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (
                      <span key={i}>{line}{i !== msg.text.split('\n').length -1 && <br/>}</span>
                    )) : JSON.stringify(msg.text)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex w-full justify-start">
                  <div className="max-w-xs px-4 py-2.5 rounded-xl bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 shadow-md animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              {error && (
                <div className="flex w-full justify-center">
                  <div className="w-full max-w-md p-3 rounded-lg bg-red-100 text-red-700 border border-red-300 shadow-lg text-sm">
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              )}
              {!currentUser && messages.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-10 flex flex-col items-center justify-center">
                  <p className="text-lg">Please log in to start a conversation.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className={`absolute bottom-0 left-0 right-0 z-10 p-4 border-t bg-gray-50 dark:bg-gray-700 ${currentUser && isPanelOpen ? 'rounded-br-lg' : 'rounded-b-lg'}`}>
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
                  className="flex-grow px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200"
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

      {showModal && isNewUser && (
        <WelcomeModal onClose={() => setShowModal(false)} user={user} />
      )}
    </>
  );
};

export default ChatInterface;
