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
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false); // This will now be correctly set
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingSignupDetails, setPendingSignupDetails] = useState(null);
  const [isCompletingPostStripeSignup, setIsCompletingPostStripeSignup] = useState(false);
  const [authError, setAuthError] = useState(null); // For displaying auth errors

  useEffect(() => {
    // Handle sign in with email link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            window.history.replaceState({}, document.title, window.location.pathname);
            setAuthError(null); // Clear any previous auth errors
            // User is signed in, onAuthStateChanged will handle the rest
          })
          .catch((error) => {
            console.error("Error signing in with email link:", error);
            setAuthError(error.message || "Failed to sign in with email link. The link may be invalid or expired.");
            window.localStorage.removeItem('emailForSignIn');
          });
      } else {
        setAuthError("Email is required to complete sign-in.");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoadingAuth(true);
        try {
          const storedUid = localStorage.getItem('signupUid');
          // const storedEmail = localStorage.getItem('signupEmail'); // Keep for potential future use if needed

          const existsInFirestore = await checkIfUserExists(user.uid);

          if (existsInFirestore) {
            if (storedUid === user.uid) {
              // User exists in Firestore AND signupUid matches:
              // This is a user returning from a successful Stripe signup.
              console.log('App.js: User returning from Stripe, exists in Firestore. Setting as new user for tutorial and redirecting to success page.');
              setCurrentUser(user);
              setIsNewUser(true); // Treat as new user for tutorial purposes
              setIsCompletingPostStripeSignup(true); // Redirect to subscription success
              // Clear localStorage now that we've identified them
              localStorage.removeItem('signupFirstName');
              localStorage.removeItem('signupLastName');
              localStorage.removeItem('signupEmail');
              localStorage.removeItem('signupUid');
              localStorage.removeItem('signupPhotoURL');
            } else {
              // User exists in Firestore, but no matching storedUid:
              // This is a genuinely existing, returning user.
              console.log('App.js: Existing user, proceeding to login.');
              await updateUserLastLogin(user.uid);
              setCurrentUser(user);
              setIsNewUser(false);
              setIsCompletingPostStripeSignup(false);
              // Clear any potentially stale localStorage items
              localStorage.removeItem('signupFirstName');
              localStorage.removeItem('signupLastName');
              localStorage.removeItem('signupEmail');
              localStorage.removeItem('signupUid');
              localStorage.removeItem('signupPhotoURL');
            }
          } else {
            // User does NOT exist in Firestore.
            // This could be a brand new user starting the signup flow,
            // or someone who completed Firebase auth but didn't finish the Stripe part where the DB record is made.
            if (storedUid === user.uid) {
               // This case implies they went to Stripe, but the backend didn't create the user record yet,
               // or they came back before the webhook processed.
               // The SubscriptionSuccess page has polling, so we can direct them there.
               // We'll mark them as new user and let SubscriptionSuccess handle verification.
              console.log('App.js: User authenticated, not in Firestore, but signupUid matches. Likely post-Stripe, pre-DB record. Setting as new user for tutorial.');
              setCurrentUser(user);
              setIsNewUser(true);
              setIsCompletingPostStripeSignup(true); // Let SubscriptionSuccess page handle polling for DB record
            } else {
              // Brand new user, or incomplete previous signup not related to current Stripe flow.
              console.log('App.js: New user (not in Firestore, no matching signupUid), showing signup modal.');
              setPendingSignupDetails(user);
              setShowSignupModal(true);
              setCurrentUser(null); // Don't set current user until modal is completed
              setIsNewUser(true); // Will be a new user after modal
              setIsCompletingPostStripeSignup(false);
            }
          }
          setLoadingAuth(false);
        } catch (error) {
          console.error("Error in user check/setup:", error);
          setAuthError("Error during user setup: " + error.message);
          auth.signOut(); // Sign out on error to prevent inconsistent state
          setCurrentUser(null);
          setShowSignupModal(false);
          setPendingSignupDetails(null);
          setIsCompletingPostStripeSignup(false);
          setLoadingAuth(false);
        }
      } else {
        // User is signed out
        console.log('App.js: User signed out.');
        setCurrentUser(null);
        setIsNewUser(false);
        setShowSignupModal(false);
        setPendingSignupDetails(null);
        setIsCompletingPostStripeSignup(false);
        setLoadingAuth(false);
        // Optionally clear localStorage here too if it makes sense for your logout flow
        // localStorage.removeItem('signupUid'); // etc.
      }
    });

    return () => unsubscribe();
  }, []); // Empty dependency array: runs once on mount and cleans up on unmount

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
    if (auth.currentUser && !isCompletingPostStripeSignup && !showSignupModal) {
      setLoadingAuth(false);
    } else if (!auth.currentUser && !showSignupModal && !isSignInWithEmailLink(auth, window.location.href)) {
      // If no user, not showing modal, and not in email link flow, stop loading.
      setLoadingAuth(false);
    } else if (showSignupModal || isCompletingPostStripeSignup || isSignInWithEmailLink(auth, window.location.href)) {
      // If modal is shown, or completing stripe, or in email link flow, let those processes manage loading/UI.
      // setLoadingAuth(false) might be appropriate here too, depending on desired UX.
      // For now, we assume these states have their own loading indicators or are quick.
    }
  }, [currentUser, isCompletingPostStripeSignup, showSignupModal]);


  if (loadingAuth && !showSignupModal && !isCompletingPostStripeSignup && !isSignInWithEmailLink(auth, window.location.href)) {
    return <div>Loading...</div>;
  }

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
