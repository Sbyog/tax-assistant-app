import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage } from '../api/chatApi';
import { transcribeAudio } from '../api/speechApi'; // Import the new API function
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

const PaperAirplaneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M3.105 3.105a.75.75 0 01.815-.398l13.587 6.038a.75.75 0 010 1.312L3.92 17.293a.75.75 0 01-1.213-.815L4.35 10 2.707 8.354a.75.75 0 01.815-1.213L6.038 8.75l8.65-8.65a.75.75 0 011.06 1.06L8.75 8.188l1.546 1.546a.75.75 0 01-1.06 1.06L7.188 8.75l-1.707 1.707a.75.75 0 01-1.06-1.06L5.813 8l-2.708-2.707a.75.75 0 010-1.061L4.35 2.707 3.105 3.105z" />
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
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 768); // Initialize based on screen width (md breakpoint)
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
  const [trialEndDate, setTrialEndDate] = useState(null); // Added to store trial end date
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState(''); // For subscribe button errors
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [currentMessagesPagination, setCurrentMessagesPagination] = useState({ hasMore: false, nextPageAfter: null, firstIdInBatch: null });
  const messagesEndRef = useRef(null);
  const chatLogRef = useRef(null); // Ref for the scrollable chat log container

  // Voice input states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]); // Use useRef for synchronous updates to audio chunks
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Effect to handle window resize for panel visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setIsPanelOpen(false);
      } else {
        setIsPanelOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derived state to control UI elements based on subscription
  const isSubscriptionActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  useEffect(() => {
    // Scroll to bottom only if not loading more, or if it is the very first load of a selected conversation
    if (messagesEndRef.current && (!currentMessagesPagination.nextPageAfter || messages.length <= 20)) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentMessagesPagination.nextPageAfter]);

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

  // Memoized data fetching functions
  const fetchUserData = useCallback(async (userId) => {
    if (!userId) return;
    try {
      await getUserData(userId); // Call API, but userData state was removed
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []); // No dependencies as it doesn't set component state directly that it depends on

  const checkUserSubscription = useCallback(async (userId) => {
    if (!userId) return;
    setSubscriptionLoading(true);
    setSubscribeError('');
    try {
      const result = await checkSubscriptionStatus(userId);
      if (result.success) {
        setSubscriptionStatus(result.status);
        if (result.status === 'trialing' && result.trialEndDate) {
          setTrialEndDate(result.trialEndDate);
        } else {
          setTrialEndDate(null);
        }
      } else {
        setSubscriptionStatus('inactive');
        setTrialEndDate(null);
        console.error('Error checking subscription:', result.error);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus('inactive');
      setTrialEndDate(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []); // Removed state setters from deps as they are stable

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return; // Relies on currentUser state
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
  }, [currentUser]); // Added currentUser as a dependency

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setMessages([]);
      setThreadId(null);
      setError(null);
      if (!user) {
        setSubscriptionStatus('unknown');
        setTrialEndDate(null);
        setConversations([]); 
        setSelectedConversationId(null); 
      }
    });
    return () => unsubscribe();
  }, []); // Removed setters from deps, they are stable

  // Effect to fetch user-specific data when currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.uid) {
      fetchUserData(currentUser.uid);
      checkUserSubscription(currentUser.uid);
      fetchConversations();
    }
  }, [currentUser, fetchUserData, checkUserSubscription, fetchConversations]);

  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = Math.max(end - now, 0); // Ensure no negative days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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

  const handleSend = async (textToSend) => {
    const currentMessage = typeof textToSend === 'string' ? textToSend : input;
    if (!currentMessage.trim()) return;

    if (!currentUser) {
      setError('You must be logged in to chat.');
      return;
    }

    const userMessage = { sender: 'user', text: currentMessage };
    setMessages(prevMsgs => [...prevMsgs, userMessage]);

    if (typeof textToSend !== 'string' || textToSend === input) {
      setInput('');
    }

    setIsLoading(true);
    setError(null);

    let localThreadId = threadId; 

    try {
      const response = await sendMessage(currentMessage, localThreadId); 
      if (response.success && response.data) {
        const newThreadId = response.data.threadId;
        const allBotTextsFromApi = response.data.messages || [];

        setMessages(prevMsgs => {
          const existingBotTextsInState = new Set(
            prevMsgs.filter(m => m.sender === 'bot').map(m => m.text)
          );

          const trulyNewBotTexts = allBotTextsFromApi.filter(
            text => !existingBotTextsInState.has(text)
          );
          
          const newBotMessageObjects = trulyNewBotTexts.map(text => ({
            sender: 'bot',
            text: text,
            id: `bot-${Date.now()}-${Math.random()}`
          }));

          return [...prevMsgs, ...newBotMessageObjects];
        });

        if (!localThreadId && newThreadId) { 
          setThreadId(newThreadId); 
          localThreadId = newThreadId; 

          if (userMessage && allBotTextsFromApi.length > 0) {
            setIsSavingConversation(true);
            try {
              let title = userMessage.text.substring(0, 40);
              if (userMessage.text.length > 40) title += "...";

              const conversationData = {
                threadId: newThreadId,
                title: title, 
                firstMessagePreview: `User: ${userMessage.text.substring(0, 100)}`,
                lastMessagePreview: `Assistant: ${allBotTextsFromApi[allBotTextsFromApi.length - 1].substring(0,100)}`,
                modelUsed: response.data.modelUsed || "gemini-1.5-pro", 
              };
              const saveResult = await saveConversation(conversationData);
              if (saveResult.success) {
                setConversations(prevConvos => [saveResult.data, ...prevConvos]);
                setSelectedConversationId(saveResult.data.id);
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
          console.warn("Thread ID changed mid-conversation. Old:", localThreadId, "New:", newThreadId);
        }

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

  const handleNewConversation = () => {
    setMessages([]);
    setThreadId(null);
    setSelectedConversationId(null);
    setInput('');
    setError(null);
  };

  const handleSelectConversation = async (conversation, loadMore = false) => {
    if (!loadMore && selectedConversationId === conversation.id && messages.length > 0) {
      return;
    }

    setIsLoading(true); 
    setError(null); 

    const conversationToLoad = conversation || conversations.find(c => c.id === selectedConversationId);
    if (!conversationToLoad) {
      setError("Conversation not found.");
      setIsLoading(false);
      return;
    }

    if (!loadMore) {
      setMessages([]); 
      setSelectedConversationId(conversationToLoad.id);
      setThreadId(conversationToLoad.threadId); 
      setCurrentMessagesPagination({ hasMore: false, nextPageAfter: null, firstIdInBatch: null }); 
    }

    try {
      const options = {
        limit: 30,
        order: 'asc',
        after: loadMore ? currentMessagesPagination.nextPageAfter : null,
      };

      const response = await getConversationMessages(conversationToLoad.id, options);

      if (response.success && response.messages) {
        const formattedMessages = response.messages.map(msg => ({
          id: msg.id, 
          sender: msg.role === 'user' ? 'user' : 'bot',
          text: msg.content,
          timestamp: msg.createdAt 
        })); 
        
        setMessages(prevMessages => loadMore ? [...formattedMessages, ...prevMessages] : formattedMessages);
        
        if (response.pagination) {
          setCurrentMessagesPagination({
            hasMore: response.pagination.hasMore,
            nextPageAfter: response.pagination.nextPageAfter, 
            firstIdInBatch: response.pagination.firstIdInBatch
          });
        }

        if (loadMore && chatLogRef.current && response.messages.length > 0) {
          const firstNewMessageId = response.messages[0]?.id;
          if (firstNewMessageId) {
            const element = document.getElementById(`msg-${firstNewMessageId}`);
            if (element) {
              setTimeout(() => element.scrollIntoView({ behavior: 'auto', block: 'start' }), 0);
            }
          }
        } else if (!loadMore && messagesEndRef.current) {
          setTimeout(() => messagesEndRef.current.scrollIntoView({ behavior: "smooth" }), 0);
        }

      } else {
        setError(response.message || 'Failed to load messages for this conversation.');
        if (!loadMore) setMessages([]); 
      }
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      setError(err.message || 'An error occurred while fetching messages.');
      if (!loadMore) setMessages([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationIdToDelete, event) => {
    event.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    setHistoryLoading(true);
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

  // Voice input functions
  const startRecording = async () => {
    if (!currentUser || !isSubscriptionActive) {
      setError("Please log in and ensure your subscription is active to use voice input.");
      return;
    }
    try {
      console.log("Attempting to get user media...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("User media stream obtained:", stream);

      const mimeType = 'audio/webm';
      const isSupported = MediaRecorder.isTypeSupported(mimeType);
      console.log(`MIME type ${mimeType} supported: ${isSupported}`);
      if (!isSupported) {
        setError(`Audio format ${mimeType} is not supported by your browser.`);
        stream.getTracks().forEach(track => track.stop()); // Stop stream if format not supported
        return;
      }

      audioChunksRef.current = []; // Clear any previous chunks before starting
      const recorder = new MediaRecorder(stream, { mimeType: mimeType });
      console.log("MediaRecorder instance created:", recorder);

      recorder.onstart = () => {
        console.log("Recording started. Recorder state:", recorder.state);
      };

      recorder.ondataavailable = (event) => {
        console.log("ondataavailable event fired. Data size:", event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data); // Push directly to ref's current value
          console.log("Audio chunk pushed. Total chunks in ref:", audioChunksRef.current.length);
        } else {
          console.log("Received empty audio chunk.");
        }
      };

      recorder.onstop = async () => {
        console.log("Recording stopped. Recorder state:", recorder.state);
        console.log("Current audio chunks count in ref before blob creation:", audioChunksRef.current.length);

        const currentAudioChunks = audioChunksRef.current; 
        audioChunksRef.current = []; 

        if (currentAudioChunks.length === 0) {
          console.warn("No audio chunks were collected before onstop.");
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          return;
        }

        const audioBlob = new Blob(currentAudioChunks, { type: mimeType });
        console.log("AudioBlob created. Size:", audioBlob.size, "Type:", audioBlob.type);

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          setError(null);
          try {
            const transcribedText = await transcribeAudio(audioBlob);
            if (transcribedText) {
              await handleSend(transcribedText);
            } else {
              setError('Transcription failed or returned empty.');
            }
          } catch (transcriptionError) {
            console.error('Transcription error:', transcriptionError);
            setError(transcriptionError.message || 'Failed to transcribe audio.');
          } finally {
            setIsTranscribing(false);
          }
        } else {
          console.warn("No audio data recorded to blob, or blob is empty (though chunks were present).");
        }
        stream.getTracks().forEach(track => track.stop());
        console.log("Microphone tracks stopped.");
        setIsRecording(false); 
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setError(`Recording error: ${event.error.name} - ${event.error.message}`);
        setIsRecording(false);
        audioChunksRef.current = []; // Clear chunks on error too
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      console.log("MediaRecorder.start() called. Recorder state should be 'recording'.");

    } catch (err) {
      console.error('Error accessing microphone or starting recording:', err);
      let errorMessage = 'Microphone access denied or not available. Please check permissions.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please ensure a microphone is connected and enabled.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings for this site.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use or not readable. Please check if another application is using it.';
      }
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    console.log("stopRecording called. Current mediaRecorder state:", mediaRecorder?.state);
    if (mediaRecorder && mediaRecorder.state === "recording") { 
      mediaRecorder.stop();
      console.log("MediaRecorder.stop() called.");
    } else if (mediaRecorder && mediaRecorder.state === "inactive") {
      console.log("Recorder was already inactive.");
      if (isRecording) setIsRecording(false);
      if (mediaRecorder.stream && mediaRecorder.stream.getTracks) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        console.log("Ensured microphone tracks stopped for inactive recorder.");
      }
    } else {
      console.warn("stopRecording called but no active mediaRecorder or recorder not in 'recording' state.");
      if (isRecording) setIsRecording(false);
    }
  };

  const handleVoiceInputClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <>
      <div className="flex h-full w-full bg-gray-200 dark:bg-gray-900">
        {currentUser && isPanelOpen && (
          <div className="w-64 bg-slate-100 text-slate-800 dark:bg-gray-800 dark:text-slate-200 p-4 flex flex-col rounded-l-lg shadow-xl">
            <div className="flex justify-between items-center mb-1">
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
              disabled={!isSubscriptionActive} // Disable if subscription not active
              className="w-full flex items-center justify-center px-3 py-2 mt-4 mb-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 focus:outline-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>

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
                  <div className="my-3 p-3 bg-yellow-100 dark:bg-yellow-700_too_transparent border border-yellow-300 dark:border-yellow-600 rounded-md text-center">
                    <p className="text-sm text-gray-700 dark:text-gray-500 font-medium">Subscription Required</p>
                    <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                      Please subscribe or ensure your subscription is active to use all features.
                    </p>
                    <button
                      onClick={handleSubscribe}
                      disabled={subscriptionLoading}
                      className="mt-2 w-full py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 text-white bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                    >
                      {subscriptionLoading && subscribeError === '' ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : 'Subscribe Now'}
                    </button>
                  </div>
                )}
                {subscribeError && <p className="text-red-500 dark:text-red-400 text-xs text-center mb-2">{subscribeError}</p>}
              </>
            )}

            {/* Display trial days left */} 
            {subscriptionStatus === 'trialing' && trialEndDate && (
              <div className="my-3 px-1 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                  {calculateDaysLeft(trialEndDate)} days left in free trial
                </p>
              </div>
            )}

            <button
              onClick={handleAccountNavigation}
              className="w-full mb-3 py-2.5 px-4 rounded-md text-sm font-medium flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
            >
              Account
            </button>

            <div className="mb-3 mt-0">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center px-3 py-2.5 text-sm rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors duration-150"
              >
                {theme === 'light' ? 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path fillRule='evenodd' d='M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.516a.75.75 0 01.808.488z' clipRule='evenodd' /></svg>Switch to Dark</span> : 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path d='M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 14.596a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06zM5.404 5.404a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06z' /></svg>Switch to Light</span>}
              </button>
            </div>

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
                    <span>Welcome, {user.displayName?.split(' ')[0] || 'friend'}!</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div ref={chatLogRef} className="absolute top-[53px] bottom-[76px] left-0 right-0 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 scroll-smooth">
            <div className="w-full max-w-3xl mx-auto flex flex-col space-y-3">
              {/* Button to load more messages */} 
              {selectedConversationId && currentMessagesPagination.hasMore && !isLoading && (
                <div className="flex justify-center my-3">
                  <button
                    onClick={() => {
                      const currentConvo = conversations.find(c => c.id === selectedConversationId);
                      if (currentConvo) {
                        handleSelectConversation(currentConvo, true);
                      }
                    }}
                    disabled={!isSubscriptionActive} // Disable if subscription not active
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load Previous Messages
                  </button>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={msg.id || index} id={`msg-${msg.id}`} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              <div className="flex items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading && currentUser) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={currentUser ? (isSubscriptionActive ? (selectedConversationId ? "Reply..." : "Type your message... (Shift+Enter for new line)") : "Subscribe to chat") : "Log in to chat"}
                  className="flex-grow px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 resize-none overflow-y-auto hide-scrollbar"
                  rows="1"
                  style={{ maxHeight: '120px' }}
                  disabled={isLoading || !currentUser || isSavingConversation || !isSubscriptionActive || isTranscribing || isRecording}
                />
                <button
                  onClick={handleVoiceInputClick}
                  className={`ml-2 px-1.5 py-2 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none disabled:opacity-50 ${isRecording ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                  disabled={isLoading || !currentUser || isSavingConversation || !isSubscriptionActive || isTranscribing}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isTranscribing ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isRecording ? (
                    // Stop Icon (Square) with animation
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 5h10v10H5V5z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    // Microphone Icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                      <path fillRule="evenodd" d="M5.5 8.5A.5.5 0 016 8h8a.5.5 0 010-1.5H6a.5.5 0 01-.5-.5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M10 18a7 7 0 007-7h-1.558a5.5 5.5 0 01-10.884 0H3a7 7 0 007 7z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleSend}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2.5 rounded-md disabled:opacity-50 shadow-sm ml-2 flex items-center justify-center" // Adjusted padding for icon
                  disabled={isLoading || !input.trim() || !currentUser || isSavingConversation || !isSubscriptionActive || isTranscribing || isRecording}
                >
                  {isSavingConversation || isLoading || isTranscribing ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <PaperAirplaneIcon />
                  )}
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
