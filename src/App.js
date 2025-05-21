import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';
import AccountPage from './pages/AccountPage';
import SignupModal from './components/SignupModal';
import { auth } from './firebase';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'; // Ensure all are imported
import { checkIfUserExists, createUserInFirestore, getUserData } from './services/userService'; // Added userService functions
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
  const [currentUser, setCurrentUser] = useState(null); // This will store the user object from our backend
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false); // Indicates if user was created in this session
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingSignupDetails, setPendingSignupDetails] = useState(null);
  const [isCompletingPostStripeSignup, setIsCompletingPostStripeSignup] = useState(false);
  const [authError, setAuthError] = useState(null);

  const emailLinkSignInInitiatedThisSession = React.useRef(false);
  const processingEmailLinkRef = React.useRef(false);

  useEffect(() => {
    console.log("App.js: Current URL at useEffect start:", window.location.href);
    const currentUrlIsEmailLink = isSignInWithEmailLink(auth, window.location.href);
    console.log("App.js: useEffect run. URL is email link?", currentUrlIsEmailLink, "Initiated this session?", emailLinkSignInInitiatedThisSession.current);

    if (currentUrlIsEmailLink && !emailLinkSignInInitiatedThisSession.current && !auth.currentUser) {
      console.log("App.js: Initial processing of email link URL.");
      emailLinkSignInInitiatedThisSession.current = true;
      processingEmailLinkRef.current = true;
      setLoadingAuth(true);
      setAuthError(null);

      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // User opened the link on a different device. To prevent session fixation
        // attacks, ask the user to provide the email again. For simplicity,
        // we'll log an error and not proceed. In a real app, show a form.
        console.error("App.js: Email link sign-in: email not found in localStorage.");
        setAuthError("Your sign-in link is valid, but we need your email to complete the process. Please try signing in again from the original device or browser.");
        setLoadingAuth(false);
        processingEmailLinkRef.current = false;
        // Potentially clear the flag so they can retry if they navigate away and back
        // emailLinkSignInInitiatedThisSession.current = false; // Or manage this more carefully
        // No 'return' here, let onAuthStateChanged handle the no-user state if signInWithEmailLink isn't called.
      }

      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            console.log("App.js: Email link sign-in successful for user:", result.user.uid);
            window.localStorage.removeItem('emailForSignIn');
            // onAuthStateChanged will handle setting the user.
            // processingEmailLinkRef will be set to false by onAuthStateChanged.
          })
          .catch((error) => {
            console.error("App.js: Error signing in with email link:", error);
            setAuthError(`Error signing in: ${error.message}. Please ensure you are using the same device and browser where you initiated the sign-in, or try requesting a new link.`);
            setLoadingAuth(false);
            processingEmailLinkRef.current = false;
            // Reset the flag to allow retrying the link if it's a recoverable error (e.g. user enters email)
            // For now, if it fails, it fails.
          });
      } else if (!email && !authError) { // If email was not found and no error set yet
        setAuthError("Could not complete sign-in. Email not provided for verification.");
        setLoadingAuth(false);
        processingEmailLinkRef.current = false;
      }
    } else if (emailLinkSignInInitiatedThisSession.current && !auth.currentUser && !processingEmailLinkRef.current) {
      // This case might occur if the email link was initiated, but then something interrupted it
      // before onAuthStateChanged could pick up a user, or if signInWithEmailLink failed silently earlier.
      // Or if user navigated away and came back with the link.
      console.log("App.js: Email link initiated but no user and not actively processing. Resetting loading state.");
      setLoadingAuth(false); // Ensure loading isn't stuck.
    }


    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("App.js: onAuthStateChanged triggered. authUser:", authUser ? authUser.uid : 'null', "Processing email link:", processingEmailLinkRef.current);
      
      // If we just processed an email link, signInWithEmailLink's promise resolves *before* onAuthStateChanged fully settles.
      // The processingEmailLinkRef helps manage the loading state during this period.
      // Once onAuthStateChanged fires (whether with user or null), we can consider the email link processing attempt concluded for this cycle.
      if(emailLinkSignInInitiatedThisSession.current) { // If an email link attempt was made in this session
          processingEmailLinkRef.current = false; // Mark email link processing as no longer active
      }

      if (authUser) {
        setLoadingAuth(true); // Start loading auth state for backend checks
        setAuthError(null); // Clear previous errors
        try {
          const exists = await checkIfUserExists(authUser.uid);
          let appUser;

          if (!exists) {
            console.log(`App.js: User ${authUser.uid} (Email: ${authUser.email}) does not exist. Creating...`);
            const firebaseUserForCreation = {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
            };
            appUser = await createUserInFirestore(firebaseUserForCreation);
            if (!appUser || !appUser.uid) { // Ensure backend returned a valid user object
                throw new Error("User creation in backend failed or returned invalid data.");
            }
            setIsNewUser(true); // Set isNewUser state
            console.log("App.js: New user created and data fetched:", appUser);
          } else {
            setIsNewUser(false); // User exists
            console.log(`App.js: User ${authUser.uid} exists. Fetching data...`);
            appUser = await getUserData(authUser.uid);
            if (!appUser || !appUser.uid) { // Ensure backend returned a valid user object
                 throw new Error("Failed to fetch data for existing user or data was invalid.");
            }
            console.log("App.js: Existing user data fetched:", appUser);
          }
          
          setCurrentUser(appUser); // Store the full user object from our backend (includes signUpDate)

          // Logic for SignupModal: If it's a new user and their display name is not set,
          // you might want to show a modal to collect it.
          // This depends on whether SignupModal is repurposed for name collection
          // instead of Stripe. For now, this is commented out as SignupModal leads to Stripe.
          // if (isNewUser && appUser && !appUser.displayName) {
          //   console.log("App.js: New user without display name, potentially show modal to collect name.");
          //   setPendingSignupDetails(appUser); // Pass the backend user object
          //   setShowSignupModal(true);
          // }

        } catch (error) {
          console.error("App.js: Error in onAuthStateChanged user processing:", error);
          setAuthError(error.message || "An error occurred while setting up your account. Please try signing out and in again.");
          setCurrentUser(null); // Critical failure, don't leave a partial user state
          setIsNewUser(false);
          // Optionally, sign the user out of Firebase as well if backend sync is critical
          // auth.signOut().catch(e => console.error("Error signing out Firebase user after backend failure:", e));
        } finally {
          // Only set loadingAuth to false if not actively processing an email link that hasn't authed yet
          // However, by this point onAuthStateChanged has fired, so email link processing should be done for this cycle.
          setLoadingAuth(false);
        }
      } else {
        // User is signed out from Firebase
        console.log("App.js: User is signed out.");
        setCurrentUser(null);
        setIsNewUser(false);
        setLoadingAuth(false); // Not loading if no user
        setAuthError(null); // Clear any auth errors on sign out
        emailLinkSignInInitiatedThisSession.current = false; // Reset for next session
        // Any other cleanup for signed-out state
      }
    });

    return () => {
      console.log("App.js: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, []); // Keep original empty dependency array for onAuthStateChanged listener setup

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

  // console.log("App.js: Rendering Check. loadingAuth:", loadingAuth, "processingEmailLinkRef:", processingEmailLinkRef.current, "currentUser:", currentUser ? currentUser.uid : 'null', "showSignupModal:", showSignupModal, "isCompletingPostStripeSignup:", isCompletingPostStripeSignup, "currentPath:", window.location.pathname, "isEmailLinkRaw:", isSignInWithEmailLink(auth, window.location.href));

  // Revised loading condition:
  // Show loading if:
  // 1. loadingAuth is true (Firebase auth state changing or backend user fetch in progress)
  // 2. OR actively processing an email link (before onAuthStateChanged might have set currentUser)
  // AND we are not showing the signup modal (which has its own UI)
  // AND not in the post-stripe signup completion phase (which might have its own loading/redirect)
  const activelyProcessingEmailLink = processingEmailLinkRef.current && isSignInWithEmailLink(auth, window.location.href) && !currentUser;

  if ((loadingAuth || activelyProcessingEmailLink) && !showSignupModal && !isCompletingPostStripeSignup) {
    console.log("App.js: Rendering Loading... div. loadingAuth:", loadingAuth, "activelyProcessingEmailLink:", activelyProcessingEmailLink);
    return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading...</div></div>;
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
