import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoPaperPlane } from 'react-icons/io5'; // Import the solid icon
import { HiMenu, HiX } from 'react-icons/hi'; // Import menu and close icons
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm for table support
import rehypeRaw from 'rehype-raw'; // Import rehype-raw for HTML support
import { sendMessage } from '../api/chatApi';
import { transcribeAudio } from '../api/speechApi'; // Import the new API function
import { auth } from '../firebase';
import { getUserData, markTutorialAsCompleted } from '../services/userService'; // Import userService functions
import { createCheckoutSession, checkSubscriptionStatus } from '../services/paymentService';
import { saveConversation, listConversations, getConversationMessages, deleteConversation } from '../services/historyService';

const WelcomeModal = ({ onClose, user }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 transform transition-all animate-fadeIn border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="h-12 w-12 rounded-full mr-4 border-2 border-blue-400 shadow-md"
              />
            ) : (
              <div className="h-12 w-12 rounded-full mr-4 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600">
                Welcome!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                {user?.displayName || 'New User'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-6 text-gray-700 dark:text-gray-300 space-y-4">
          <p className="text-base">Thank you for joining our AI tax assistant platform! This application allows you to:</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <span>Chat with our advanced AI tax assistant</span>
            </div>
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Get intelligent responses to your tax questions</span>
            </div>
            <div className="flex items-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Maintain conversation history for future reference</span>
            </div>
          </div>
          <p className="pt-2">We're excited to have you here and hope our assistant makes your tax-related tasks easier and more efficient.</p>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = ({ isNewUser, user, welcomeMessage, showWelcome, isChatDisabled, trialMessage }) => { // Added trialMessage prop
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 768); // Initialize based on screen width (md breakpoint)
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 768); // For placeholder text
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
        setIsWideScreen(false); // Update for placeholder
      } else {
        setIsPanelOpen(true);
        setIsWideScreen(true); // Update for placeholder
      }
    };

    window.addEventListener('resize', handleResize);
    // Call once to set initial state based on current width
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derived state to control UI elements based on subscription
  const isSubscriptionActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  // New derived state: chat is allowed if Home.js says so (via trialMessage) OR if there's an active Stripe subscription/trial
  const effectiveSubscriptionAllowsChat = (trialMessage !== '') || isSubscriptionActive;

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
      // checkUserSubscription is called here, which sets subscriptionStatus and trialEndDate
      checkUserSubscription(currentUser.uid);
      fetchConversations();
    }
  }, [currentUser, fetchUserData, checkUserSubscription, fetchConversations]);

  // New state to track if the trial has truly expired (7 days passed for a 'new' user)
  const [isTrialReallyExpired, setIsTrialReallyExpired] = useState(false);

  useEffect(() => {
    // This effect determines if the trial has *actually* expired based on Home.js logic
    // isChatDisabled becomes true when 7 days have passed for a 'new' user.
    // We also need to ensure this is for a 'new' user as per Home.js logic.
    if (user && user.subscriptionStatus === 'new' && isChatDisabled) {
      setIsTrialReallyExpired(true);
    } else {
      setIsTrialReallyExpired(false);
    }
  }, [user, isChatDisabled]);

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
    if (!currentUser || !effectiveSubscriptionAllowsChat) { // MODIFIED HERE
      setError("Voice input requires an active subscription or trial period."); // MODIFIED ERROR MESSAGE
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
              setInput(prevInput => prevInput ? prevInput + ' ' + transcribedText : transcribedText); // New behavior: append to input
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

  // Log the received 'isChatDisabled' prop and the component's internal 'isLoading' state
  console.log(`ChatInterface Render: Props: isChatDisabled=${isChatDisabled}. Internal state: isLoading=${isLoading} (actual isLoading variable might differ)`);

  return (
    <>
      <div className="flex h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-3">
        {currentUser && isPanelOpen && (
          <div className="w-72 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 p-5 flex flex-col rounded-l-lg shadow-lg border-r border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Chat History</h3>
              <button 
                onClick={() => setIsPanelOpen(false)} 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                aria-label="Close history panel"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleNewConversation}
              disabled={!effectiveSubscriptionAllowsChat}
              className="w-full flex items-center justify-center px-4 py-3 mt-2 mb-4 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>

            <div className="flex-grow overflow-y-auto mb-4 space-y-1.5 pr-1 custom-scrollbar">
              {historyLoading && !conversations.length ? (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading history...</p>
                </div>
              ) : historyError ? (
                <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Error: {historyError}
                  </div>
                </div>
              ) : conversations.length === 0 && !historyLoading ? (
                <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2">No conversations yet.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start a new chat to begin!</p>
                </div>
              ) : (
                conversations.map(convo => (
                  <div
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className={`group relative py-2 px-3 rounded-lg cursor-pointer text-sm border transition-all duration-200 ${
                      selectedConversationId === convo.id 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/30 shadow-sm' 
                        : 'hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50'
                    }`}
                    title={convo.title}
                  >
                    <div className="flex items-center pr-5">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 mr-1.5 flex-shrink-0 ${
                        selectedConversationId === convo.id 
                          ? 'text-blue-500 dark:text-blue-400' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className={`truncate font-medium ${
                        selectedConversationId === convo.id 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {convo.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(convo.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label="Delete conversation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Display trial message from Home.js if it exists */}
            {trialMessage && (
              <div className="my-3 px-3 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 text-center">
                <div className="flex items-center justify-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Trial Status</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {trialMessage}
                </p>
              </div>
            )}

            {/* Conditional rendering for subscription cards/messages */}
            {subscriptionLoading && subscriptionStatus === 'unknown' ? (
              <div className="text-center my-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-2"></div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Loading subscription status...</p>
              </div>
            ) : !trialMessage ? ( // Only show these if 7-day app trial message isn't active
              <>
                {isTrialReallyExpired && subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing' ? (
                  // Card 1: App trial expired for 'new' user, and no active/trialing Stripe sub
                  <div className="my-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-lg text-center">
                    <div className="flex justify-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">Subscription Required</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 mb-2">
                      Your free trial has ended. Please subscribe to continue using the chat.
                    </p>
                    <button
                      onClick={handleSubscribe}
                      disabled={subscriptionLoading}
                      className="w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow"
                    >
                      {subscriptionLoading && subscribeError === '' ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : 'Subscribe Now'}
                    </button>
                  </div>
                ) : !isTrialReallyExpired && subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing' && subscriptionStatus !== 'unknown' ? (
                  // Card 2: Not an app trial expiration scenario, but Stripe status is problematic (e.g., inactive, past_due)
                  <div className="my-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-lg text-center">
                    <div className="flex justify-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">Subscription Issue</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 mb-2">
                      Please check your subscription status or subscribe to use all features.
                    </p>
                    <button
                      onClick={handleSubscribe}
                      disabled={subscriptionLoading}
                      className="w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow"
                    >
                      {subscriptionLoading && subscribeError === '' ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : 'Subscribe Now'}
                    </button>
                  </div>
                ) : subscriptionStatus === 'trialing' && trialEndDate ? (
                  // Card 3: Stripe's own trial is active (and not overridden by other messages)
                  <div className="my-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-center">
                    <div className="flex items-center justify-center space-x-1 text-blue-600 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{calculateDaysLeft(trialEndDate)} days left in trial</span>
                    </div>
                  </div>
                ) : null}
                
                {/* Common subscribe error message, if any, when subscription cards might be shown */}
                {subscribeError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg my-2">
                      <p className="text-red-600 dark:text-red-400 text-xs text-center">{subscribeError}</p>
                    </div>
                )}
              </>
            ) : null} {/* End of !trialMessage block */}

            <div className="mt-auto space-y-3">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center px-4 py-2.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/70 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200 font-medium"
              >
                {theme === 'light' ? 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path fillRule='evenodd' d='M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.516a.75.75 0 01.808.488z' clipRule='evenodd' /></svg>Switch to Dark</span> : 
                  <span className="flex items-center"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 mr-2'><path d='M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 14.596a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06zM5.404 5.404a.75.75 0 101.06-1.06l1.06 1.06a.75.75 0 00-1.06 1.06l-1.06-1.06z' /></svg>Switch to Light</span>}
              </button>
              
              <button
                onClick={handleAccountNavigation}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/70 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Account
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/70 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 relative bg-white text-black dark:bg-gray-800 dark:text-white shadow-xl ${currentUser && isPanelOpen ? 'rounded-r-xl' : 'rounded-xl'} border border-gray-200 dark:border-gray-700`}>
          <div className={`absolute top-0 left-0 right-0 z-10 py-4 px-5 border-b border-gray-200 dark:border-gray-600 flex items-center bg-white dark:bg-gray-750 ${currentUser && isPanelOpen ? 'rounded-tr-lg' : 'rounded-t-lg'}`}>
            <div className="flex items-center flex-1">
              {currentUser && (
                <button 
                  onClick={() => setIsPanelOpen(!isPanelOpen)} 
                  className="mr-3 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150"
                  aria-label={isPanelOpen ? "Close history panel" : "Open history panel"}
                >
                  <HiMenu className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h2 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600">Your Tax Bot</h2>
              </div>
            </div>
            
            {showWelcomeMessage && !isNewUser && (
              <div className="text-right text-gray-700 dark:text-gray-200 font-medium animate-fadeIn">
                {user && (
                  <div className="flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                    {user.photoURL && (
                      <img src={user.photoURL} alt="Profile" className="h-6 w-6 rounded-full mr-2 border border-blue-200 dark:border-blue-700" />
                    )}
                    <span>Welcome, {user.displayName?.split(' ')[0] || 'friend'}!</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div ref={chatLogRef} className="absolute top-[60px] bottom-[80px] left-0 right-0 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 scroll-smooth custom-scrollbar">
            <div className="w-full max-w-3xl mx-auto flex flex-col space-y-4">
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
                    disabled={!effectiveSubscriptionAllowsChat}
                    className="px-5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load Previous Messages
                  </button>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={msg.id || index} id={`msg-${msg.id}`} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div
                    className={`prose prose-sm dark:prose-invert max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white prose-strong:text-white prose-a:text-blue-100 hover:prose-a:text-blue-50 border border-blue-400'
                        : 'bg-white text-gray-800 dark:bg-gray-750 dark:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-700 dark:hover:prose-a:text-blue-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {msg.sender === 'bot' && typeof msg.text === 'string' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.text}</ReactMarkdown>
                    ) : typeof msg.text === 'string' ? (
                      msg.text.split('\n').map((line, i) => (
                        <span key={i}>{line}{i !== msg.text.split('\n').length -1 && <br/>}</span>
                      ))
                    ) : (
                      JSON.stringify(msg.text)
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages.length === 0 && !selectedConversationId && (
                <div className="flex w-full justify-start">
                  <div className="flex items-center space-x-2 max-w-xs px-5 py-3.5 rounded-2xl bg-white text-gray-700 dark:bg-gray-750 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="font-medium">Thinking...</span>
                  </div>
                </div>
              )}
              {isLoading && (selectedConversationId || messages.length > 0) && (
                <div className="flex w-full justify-start">
                  <div className="flex items-center space-x-2 max-w-xs px-5 py-3.5 rounded-2xl bg-white text-gray-700 dark:bg-gray-750 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="font-medium">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              {error && (
                <div className="flex w-full justify-center">
                  <div className="w-full max-w-md p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 shadow-md text-sm dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <strong>Error:</strong> <span>{error}</span>
                    </div>
                  </div>
                </div>
              )}
              {!currentUser && messages.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-10 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-lg font-medium">Please log in to start a conversation.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className={`absolute bottom-0 left-0 right-0 z-10 p-5 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-750 ${currentUser && isPanelOpen ? 'rounded-br-lg' : 'rounded-b-lg'} shadow-sm`}>
            {!currentUser && (
              <p className="text-red-500 text-center mb-3 text-sm font-medium flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Please log in to use the chat
              </p>
            )}
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex items-center space-x-2">
                <div className="relative flex-grow">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isLoading && currentUser && effectiveSubscriptionAllowsChat) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      currentUser
                        ? effectiveSubscriptionAllowsChat
                          ? selectedConversationId
                            ? "Reply..."
                            : `Type your message...${isWideScreen ? " (Shift+Enter for new line)" : ""}`
                          : "Subscribe to chat"
                        : "Log in to chat"
                    }
                    className="flex-grow w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 resize-none overflow-y-auto hide-scrollbar"
                    rows="1"
                    style={{ maxHeight: '120px' }}
                    disabled={isLoading || !currentUser || isSavingConversation || !effectiveSubscriptionAllowsChat || isTranscribing || isRecording}
                  />
                </div>
                <button
                  onClick={handleVoiceInputClick}
                  className={`h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    isRecording 
                      ? 'text-white bg-red-500 hover:bg-red-600 focus:ring-red-500' 
                      : 'text-white bg-green-500 hover:bg-green-600 focus:ring-green-500'
                  }`}
                  disabled={isLoading || !currentUser || isSavingConversation || !effectiveSubscriptionAllowsChat || isTranscribing}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    // Stop Icon (Square) with animation
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 5h10v10H5V5z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    // Modern Microphone Icon
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleSend}
                  className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                  disabled={isLoading || !input.trim() || !currentUser || isSavingConversation || !effectiveSubscriptionAllowsChat || isTranscribing || isRecording}
                >
                  {isSavingConversation || isLoading || isTranscribing ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <IoPaperPlane className="w-5 h-5" />
                  )}
                </button>
              </div>
              {isTranscribing && (
                <div className="text-xs text-center mt-2 text-blue-600 dark:text-blue-400 font-medium">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Transcribing audio...
                  </div>
                </div>
              )}
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
