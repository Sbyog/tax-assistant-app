import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';
import AccountPage from './pages/AccountPage';
import SignupModal from './components/SignupModal';
import { auth } from './firebase';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { checkIfUserExists, createUserInFirestore, updateUserLastLogin } from './services/userService';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from './firebase';

// Helper component to manage navigation for post-Stripe signup completion
const PostStripeSignupHandler = ({ isCompleting, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isCompleting && location.pathname !== '/subscription/success') {
      console.log('PostStripeSignupHandler: Redirecting to /subscription/success');
      navigate('/subscription/success', { replace: true });
    }
  }, [isCompleting, location.pathname, navigate]);

  return children;
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Start with loading true
  const [isNewUser, setIsNewUser] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingSignupDetails, setPendingSignupDetails] = useState(null);
  const [isCompletingPostStripeSignup, setIsCompletingPostStripeSignup] = useState(false);
  const [authError, setAuthError] = useState(null);

  const emailLinkSignInInitiatedThisSession = React.useRef(false);
  const processingEmailLinkRef = React.useRef(false);

  useEffect(() => {
    console.log("App.js: Current URL at useEffect start:", window.location.href); // Log the URL
    const currentUrlIsEmailLink = isSignInWithEmailLink(auth, window.location.href);
    console.log("App.js: useEffect run. URL is email link?", currentUrlIsEmailLink, "Initiated this session?", emailLinkSignInInitiatedThisSession.current);

    if (currentUrlIsEmailLink && !emailLinkSignInInitiatedThisSession.current) {
      console.log("App.js: Initial processing of email link URL.");
      emailLinkSignInInitiatedThisSession.current = true;
      processingEmailLinkRef.current = true;
      setLoadingAuth(true); 

      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }

      if (email) {
        console.log("App.js: Attempting signInWithEmailLink for", email);
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            console.log("User signed in with email link (promise resolved):", result.user.uid);
            window.localStorage.removeItem('emailForSignIn');
            window.history.replaceState({}, document.title, '/'); // Change to root path
            setAuthError(null);
            // Force a reload to ensure the app re-initializes with the new auth state in the current tab
            window.location.reload(); 
          })
          .catch((error) => {
            console.error("Error signing in with email link:", error);
            setAuthError(error.message || "Failed to sign in with email link. Link may be invalid or expired.");
            window.localStorage.removeItem('emailForSignIn');
            processingEmailLinkRef.current = false;
            emailLinkSignInInitiatedThisSession.current = false; 
            setCurrentUser(null);
            setLoadingAuth(false);
          });
      } else {
        setAuthError("Email is required to complete sign-in.");
        processingEmailLinkRef.current = false;
        emailLinkSignInInitiatedThisSession.current = false;
        setCurrentUser(null);
        setLoadingAuth(false);
      }
    } else if (emailLinkSignInInitiatedThisSession.current && !auth.currentUser) {
      // This case handles StrictMode re-runs where the link was initiated,
      // but onAuthStateChanged hasn't fired with a user yet from that initiation.
      // We ensure we stay in a loading/processing state.
      console.log("App.js: Subsequent useEffect run, email link was initiated, user not yet current. Maintaining processing state.");
      processingEmailLinkRef.current = true; 
      setLoadingAuth(true);                  
    } else if (!currentUrlIsEmailLink) {
      // Not an email link URL, and we haven't initiated sign-in for this session via email link.
      // Or, URL was cleaned and user is already set, so emailLinkSignInInitiatedThisSession might be false.
      processingEmailLinkRef.current = false;
      // setLoadingAuth(false) will be handled by onAuthStateChanged if no user session is found.
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("App.js: onAuthStateChanged triggered. User:", user ? user.uid : 'null', "ProcessingEmailLinkRef:", processingEmailLinkRef.current, "InitiatedThisSession:", emailLinkSignInInitiatedThisSession.current);

      if (user) {
        console.log("App.js: onAuthStateChanged: User IS present:", user.uid);
        processingEmailLinkRef.current = false; 
        emailLinkSignInInitiatedThisSession.current = false; 
        
        setLoadingAuth(true); 
        try {
          const storedUid = localStorage.getItem('signupUid');
          const existsInFirestore = await checkIfUserExists(user.uid);

          if (existsInFirestore) {
            if (storedUid === user.uid) {
              console.log('App.js: User returning from Stripe, exists in Firestore. Setting as new user for tutorial and redirecting to success page.');
              setCurrentUser(user);
              setIsNewUser(true); 
              setIsCompletingPostStripeSignup(true); 
              localStorage.removeItem('signupFirstName');
              localStorage.removeItem('signupLastName');
              localStorage.removeItem('signupEmail');
              localStorage.removeItem('signupUid');
              localStorage.removeItem('signupPhotoURL');
            } else {
              console.log('App.js: Existing user, proceeding to login.');
              await updateUserLastLogin(user.uid);
              setCurrentUser(user);
              setIsNewUser(false);
              setIsCompletingPostStripeSignup(false);
              localStorage.removeItem('signupFirstName');
              localStorage.removeItem('signupLastName');
              localStorage.removeItem('signupEmail');
              localStorage.removeItem('signupUid');
              localStorage.removeItem('signupPhotoURL');
            }
          } else { 
            if (storedUid === user.uid) {
              console.log('App.js: User authenticated, not in Firestore, but signupUid matches. Likely post-Stripe, pre-DB record. Setting as new user for tutorial.');
              setCurrentUser(user);
              setIsNewUser(true);
              setIsCompletingPostStripeSignup(true); 
            } else {
              console.log('App.js: New user (not in Firestore, no matching signupUid), showing signup modal.');
              setPendingSignupDetails(user);
              setShowSignupModal(true);
              setCurrentUser(null); 
              setIsNewUser(true); 
              setIsCompletingPostStripeSignup(false);
            }
          }
          setLoadingAuth(false); 
        } catch (error) {
          console.error("Error in user check/setup:", error);
          setAuthError("Error during user setup: " + error.message);
          auth.signOut(); 
          setCurrentUser(null);
          setShowSignupModal(false);
          setPendingSignupDetails(null);
          setIsCompletingPostStripeSignup(false);
          setLoadingAuth(false); 
        }
      } else { // User is null
        if (processingEmailLinkRef.current) {
          console.log("App.js: onAuthStateChanged: user is null, but email link processing ref is true. Waiting for signInWithEmailLink to complete or error out.");
          // setLoadingAuth(true) should have been set when email link processing started.
        } else {
          console.log('App.js: User signed out or initial load without user/active email link processing. Resetting states.');
          setCurrentUser(null);
          setIsNewUser(false);
          setShowSignupModal(false);
          setPendingSignupDetails(null);
          setIsCompletingPostStripeSignup(false);
          setLoadingAuth(false); 
        }
      }
    });

    return () => {
      console.log("App.js: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, []); 

  const handleModalCancel = () => {
    setShowSignupModal(false);
    setPendingSignupDetails(null);
    // If a user cancels the signup modal, we might want to sign them out
    // or redirect them, as they are authenticated with Firebase but not fully "signed up" in our app.
    // For now, just closing modal. Consider auth.signOut() here if appropriate.
  };
  
  const handleSubscriptionSuccessShown = () => {
    console.log("App.js: SubscriptionSuccess page has been shown, setting isCompletingPostStripeSignup to false.");
    setIsCompletingPostStripeSignup(false);
  };

  // useEffect for managing loading state based on auth and modal states
  useEffect(() => {
    const urlIsEmailLink = isSignInWithEmailLink(auth, window.location.href);
    console.log("App.js: Secondary loading useEffect. currentUser:", currentUser ? currentUser.uid : 'null', "isCompletingPostStripeSignup:", isCompletingPostStripeSignup, "showSignupModal:", showSignupModal, "urlIsEmailLink:", urlIsEmailLink, "current loadingAuth state:", loadingAuth, "pathname:", window.location.pathname);

    if (currentUser && !isCompletingPostStripeSignup && !showSignupModal) {
      console.log("App.js: Secondary useEffect: Setting loadingAuth to false (user present, not modal, not stripe complete). Current path:", window.location.pathname);
      setLoadingAuth(false);
    } else if (!currentUser && !showSignupModal && !urlIsEmailLink) { 
      console.log("App.js: Secondary useEffect: Setting loadingAuth to false (no user, not modal, not email link). Current path:", window.location.pathname);
      setLoadingAuth(false);
    } else if (showSignupModal || isCompletingPostStripeSignup || urlIsEmailLink) { 
      console.log("App.js: Secondary useEffect: loadingAuth NOT changed (modal, stripe complete, or email link active). Current path:", window.location.pathname);
    } else {
      console.log("App.js: Secondary useEffect: Fallback case, loadingAuth state might need review. Current path:", window.location.pathname);
    }
  }, [currentUser, isCompletingPostStripeSignup, showSignupModal]);

  console.log("App.js: Rendering Check. loadingAuth:", loadingAuth, "currentUser:", currentUser ? currentUser.uid : 'null', "showSignupModal:", showSignupModal, "isCompletingPostStripeSignup:", isCompletingPostStripeSignup, "currentPath:", window.location.pathname, "isEmailLinkRaw:", isSignInWithEmailLink(auth, window.location.href));

  if (loadingAuth && !showSignupModal && !isCompletingPostStripeSignup && !isSignInWithEmailLink(auth, window.location.href)) {
    console.log("App.js: Rendering Loading... div because loadingAuth is true and other conditions met.");
    return <div>Loading...</div>;
  }

  console.log("App.js: Proceeding to render Router.");
  return (
    <Router>
      {authError && <div style={{ color: 'red', padding: '10px', textAlign: 'center', backgroundColor: 'lightpink', borderBottom: '1px solid darkred' }}>Error: {authError}</div>}
      <PostStripeSignupHandler isCompleting={isCompletingPostStripeSignup}>
        <Routes>
          <Route
            path="/"
            element={currentUser && !isCompletingPostStripeSignup ? <Home isNewUser={isNewUser} user={currentUser} /> : (isCompletingPostStripeSignup ? null : <Navigate to="/login" replace />)}
          />
          <Route
            path="/login"
            element={!currentUser || showSignupModal ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/subscription/success"
            element={currentUser ? <SubscriptionSuccess onSuccessShown={handleSubscriptionSuccessShown} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/subscription/cancel"
            element={currentUser ? <SubscriptionCancel /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/account"
            element={currentUser ? <AccountPage user={currentUser} /> : <Navigate to="/login" replace />}
          />
        </Routes>
        {showSignupModal && (
          <SignupModal
            user={pendingSignupDetails}
            onCancel={handleModalCancel}
            onComplete={(user) => {
              setCurrentUser(user);
              setShowSignupModal(false);
              setPendingSignupDetails(null);
            }}
          />
        )}
      </PostStripeSignupHandler>
    </Router>
  );
}

export default App;
