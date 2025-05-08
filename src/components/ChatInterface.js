import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage } from '../api/chatApi';
import { auth } from '../firebase';
import { getUserData } from '../services/userService';
import { createCheckoutSession, checkSubscriptionStatus } from '../services/paymentService';
import { saveConversation, listConversations, getConversationMessages, deleteConversation } from '../services/historyService';

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
  const navigate = useNavigate();
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
  const [subscriptionStatus, setSubscriptionStatus] = useState('unknown'); // 'unknown', 'active', 'inactive', 'trialing', 'past_due', etc.
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState(''); // For subscribe button errors
  const [userData, setUserData] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
        setConversations([]); // Clear conversations on logout
        setSelectedConversationId(null); // Clear selected conversation
        setThreadId(null); // Clear threadId
        setMessages([]); // Clear messages
      } else {
        setIsPanelOpen(true);
        fetchUserData(user.uid);
        checkUserSubscription(user.uid);
        fetchConversations(); // Fetch conversations on login
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
    setSubscribeError(''); // Clear previous subscribe errors
    try {
      const result = await checkSubscriptionStatus(userId);
      if (result.success) {
        setSubscriptionStatus(result.status); // Store the actual status string
      } else {
        setSubscriptionStatus('inactive'); // Default to inactive on error
        console.error('Error checking subscription:', result.error);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus('inactive');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!currentUser) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await listConversations();
      if (response.success) {
        setConversations(response.data || []);
      } else {
        setHistoryError(response.message || 'Failed to load conversations.');
        setConversations([]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setHistoryError(err.message || 'An error occurred while fetching conversations.');
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  const handleAccountNavigation = () => {
    navigate('/account');
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      setSubscribeError('You must be logged in to subscribe.');
      return;
    }
    setSubscriptionLoading(true);
    setSubscribeError('');
    try {
      const result = await createCheckoutSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setSubscribeError(result.error || 'Failed to create checkout session.');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setSubscribeError(err.message || 'An unexpected error occurred during subscription.');
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
    // Optimistically update UI with user message
    setMessages(prevMsgs => [...prevMsgs, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    let localThreadId = threadId; 

    try {
      const response = await sendMessage(currentInput, localThreadId); 
      if (response.success && response.data) {
        const newThreadId = response.data.threadId;
        const botMessagesFromApi = response.data.messages.map(msgText => ({ sender: 'bot', text: msgText }));

        if (!localThreadId && newThreadId) { 
          setThreadId(newThreadId); 
          localThreadId = newThreadId; 

          if (userMessage && botMessagesFromApi.length > 0) {
            setIsSavingConversation(true);
            try {
              let title = userMessage.text.substring(0, 40);
              if (userMessage.text.length > 40) title += "...";

              const conversationData = {
                threadId: newThreadId,
                title: title, 
                firstMessagePreview: `User: ${userMessage.text.substring(0, 100)}`,
                lastMessagePreview: `Assistant: ${botMessagesFromApi[botMessagesFromApi.length - 1].text.substring(0,100)}`,
                modelUsed: response.data.modelUsed || "gemini-1.5-pro", 
              };
              const saveResult = await saveConversation(conversationData);
              if (saveResult.success) {
                setConversations(prevConvos => [saveResult.data, ...prevConvos]);
                setSelectedConversationId(saveResult.data.id);
                 // Messages are already optimistic + bot response below, no need to reload.
              } else {
                console.error("Failed to save conversation:", saveResult.message);
                setError("Error: Could not save new conversation. " + saveResult.message);
              }
            } catch (saveError) {
              console.error("Error saving conversation:", saveError);
              setError("Error: Could not save new conversation. " + saveError.message);
            } finally {
              setIsSavingConversation(false);
            }
          }
        } else if (localThreadId && newThreadId && localThreadId !== newThreadId) {
          setThreadId(newThreadId);
          localThreadId = newThreadId;
          // If an existing conversation suddenly gets a new threadId from the backend,
          // we might need to update the conversation history entry or treat it as a new branch.
          // For now, just update the current threadId.
          // Consider fetching conversations again or updating the specific one if this happens.
          console.warn("Thread ID changed mid-conversation. Old:", localThreadId, "New:", newThreadId);
        }

        // Append new bot messages to the existing messages
        setMessages(prevMsgs => [...prevMsgs, ...botMessagesFromApi]);

      } else {
        setError(response.message || 'Failed to get a response from the AI.');
        // Remove the optimistically added user message if API call failed
        setMessages(prevMsgs => prevMsgs.filter(msg => msg !== userMessage));
      }
    } catch (err) {
      console.error('Error in handleSend:', err);
      setError(err.message || 'An error occurred while sending the message.');
      // Remove the optimistically added user message if API call failed
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

  const handleNewConversation = () => {
    setMessages([]);
    setThreadId(null);
    setSelectedConversationId(null);
    setInput('');
    setError(null);
  };

  const handleSelectConversation = async (conversation) => {
    if (selectedConversationId === conversation.id) return; // Avoid reloading if already selected

    setSelectedConversationId(conversation.id);
    setThreadId(conversation.threadId); // Set the threadId for the selected conversation
    setIsLoading(true); // Show loading for messages
    setError(null); // Clear previous errors
    setMessages([]); // Clear current messages before loading new ones

    try {
      const response = await getConversationMessages(conversation.id);
      if (response.success && response.messages) {
        const formattedMessages = response.messages.map(msg => ({
          sender: msg.role === 'user' ? 'user' : 'bot',
          text: msg.content
        }));
        setMessages(formattedMessages);
      } else {
        setError(response.message || 'Failed to load messages for this conversation.');
        setMessages([]); // Clear messages on error
      }
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      setError(err.message || 'An error occurred while fetching messages.');
      setMessages([]); // Clear messages on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationIdToDelete, event) => {
    event.stopPropagation(); // Prevent handleSelectConversation from firing

    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    setHistoryLoading(true); // Use historyLoading for delete operation as well
    try {
      const response = await deleteConversation(conversationIdToDelete);
      if (response.success) {
        setConversations(prevConvos => prevConvos.filter(c => c.id !== conversationIdToDelete));
        if (selectedConversationId === conversationIdToDelete) {
          handleNewConversation();
        }
      } else {
        setHistoryError(response.message || "Failed to delete conversation.");
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      setHistoryError(err.message || "An error occurred while deleting conversation.");
    } finally {
      setHistoryLoading(false);
    }
  };

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

            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center px-3 py-2 mb-3 text-sm rounded-md font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>

            <div className="mb-4 mt-0">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center px-3 py-2 text-sm rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors duration-150"
              >
                {theme === 'light' ? 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path fillRule='evenodd' d='M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.516a.75.75 0 01.808.488z' clipRule='evenodd' /></svg>Switch to Dark</span> : 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path d='M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 14.596a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06zM5.404 5.404a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06z' /></svg>Switch to Light</span>}
              </button>
            </div>

            <div className="flex-grow overflow-y-auto mb-4 space-y-1 pr-1">
              {historyLoading && !conversations.length ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-2"></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Loading history...</p>
                </div>
              ) : historyError ? (
                <div className="p-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900_too_transparent rounded-md">
                  Error: {historyError}
                </div>
              ) : conversations.length === 0 && !historyLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 px-2 py-4 text-center">No conversations yet.</p>
              ) : (
                conversations.map(convo => (
                  <div
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className={`group relative p-2.5 rounded-md cursor-pointer text-sm truncate ${selectedConversationId === convo.id ? 'bg-slate-300 dark:bg-gray-600' : 'hover:bg-slate-200 dark:hover:bg-gray-700'}`}
                    title={convo.title}
                  >
                    {convo.title}
                    <button
                      onClick={(e) => handleDeleteConversation(convo.id, e)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label="Delete conversation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {subscriptionLoading && subscriptionStatus === 'unknown' ? (
              <div className="text-center my-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-1"></div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading status...</p>
              </div>
            ) : (
              <>
                {(subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') && (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscriptionLoading}
                    className="w-full mb-3 py-2.5 px-4 rounded-md text-sm font-medium flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                  >
                    {subscriptionLoading && subscribeError === '' ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-700 dark:text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Subscribe Now'}
                  </button>
                )}
                {subscribeError && <p className="text-red-500 dark:text-red-400 text-xs text-center mb-2">{subscribeError}</p>}
              </>
            )}

            <button
              onClick={handleAccountNavigation}
              className="w-full mb-3 py-2.5 px-4 rounded-md text-sm font-medium flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
            >
              Account
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-md text-sm font-medium flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
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
              {isLoading && messages.length === 0 && !selectedConversationId && (
                <div className="flex w-full justify-start">
                  <div className="max-w-xs px-4 py-2.5 rounded-xl bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 shadow-md animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              {isLoading && (selectedConversationId || messages.length > 0) && (
                <div className="flex w-full justify-start">
                  <div className="max-w-xs px-4 py-2.5 rounded-xl bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 shadow-md animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
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
                  placeholder={currentUser ? (selectedConversationId ? "Reply..." : "Type your message...") : "Log in to chat"}
                  className="flex-grow px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200"
                  disabled={isLoading || !currentUser || isSavingConversation}
                />
                <button
                  onClick={handleSend}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-r-md disabled:opacity-50 shadow-sm"
                  disabled={isLoading || !input.trim() || !currentUser || isSavingConversation}
                >
                  {isSavingConversation ? 'Saving...' : (isLoading ? 'Sending...' : 'Send')}
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
