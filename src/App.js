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
  const [isNewUser, setIsNewUser] = useState(false);
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
          const storedEmail = localStorage.getItem('signupEmail');

          const existsInFirestore = await checkIfUserExists(user.uid);

          if (!existsInFirestore) {
            if (storedUid === user.uid && storedEmail === user.email) {
              console.log('App.js: User returning from Stripe, setting isCompletingPostStripeSignup to true.');
              setCurrentUser(user);
              setIsCompletingPostStripeSignup(true);
            } else {
              console.log('App.js: New user, showing signup modal.');
              setPendingSignupDetails(user);
              setShowSignupModal(true);
              setCurrentUser(null);
              setIsCompletingPostStripeSignup(false);
              setLoadingAuth(false);
            }
          } else {
            console.log('App.js: Existing user, proceeding to login.');
            await updateUserLastLogin(user.uid);
            setIsNewUser(false);
            setCurrentUser(user);
            setShowSignupModal(false);
            setPendingSignupDetails(null);
            setIsCompletingPostStripeSignup(false);
            localStorage.removeItem('signupFirstName');
            localStorage.removeItem('signupLastName');
            localStorage.removeItem('signupEmail');
            localStorage.removeItem('signupUid');
            localStorage.removeItem('signupPhotoURL');
            setLoadingAuth(false);
          }
        } catch (error) {
          console.error("Error in user check/setup:", error);
          auth.signOut();
          setCurrentUser(null);
          setShowSignupModal(false);
          setPendingSignupDetails(null);
          setIsCompletingPostStripeSignup(false);
          setLoadingAuth(false);
        }
      } else {
        console.log('App.js: User signed out.');
        setCurrentUser(null);
        setIsNewUser(false);
        setShowSignupModal(false);
        setPendingSignupDetails(null);
        setIsCompletingPostStripeSignup(false);
        setLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleModalCancel = () => {
    setShowSignupModal(false);
    setPendingSignupDetails(null);
  };

  useEffect(() => {
    if (isCompletingPostStripeSignup && currentUser) {
      setLoadingAuth(true);
    } else if (!isCompletingPostStripeSignup && !showSignupModal && !auth.currentUser) {
      setLoadingAuth(false);
    } else if (currentUser && !isCompletingPostStripeSignup) {
      setLoadingAuth(false);
    } else if (showSignupModal) {
      setLoadingAuth(false);
    }
  }, [isCompletingPostStripeSignup, showSignupModal, currentUser]);

  if (loadingAuth && !showSignupModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App bg-gray-100 dark:bg-gray-800 h-full flex flex-col">
        {authError && (
          <div 
            className="fixed top-0 left-0 right-0 bg-red-500 text-white p-3 text-center z-50 shadow-lg"
            role="alert"
          >
            <p>{authError}</p>
            <button 
              onClick={() => setAuthError(null)} 
              className="ml-4 bg-red-700 hover:bg-red-800 text-white font-bold py-1 px-2 rounded text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
        <PostStripeSignupHandler isCompleting={isCompletingPostStripeSignup}>
          {showSignupModal && pendingSignupDetails && (
            <SignupModal
              user={pendingSignupDetails}
              onCancel={handleModalCancel}
              setPendingSignupDetails={setPendingSignupDetails}
            />
          )}
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
              element={currentUser ? <SubscriptionSuccess /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/subscription/cancel"
              element={<SubscriptionCancel />}
            />
            <Route
              path="/account"
              element={currentUser && !isCompletingPostStripeSignup ? <AccountPage user={currentUser} /> : (isCompletingPostStripeSignup ? null : <Navigate to="/login" replace />)}
            />
          </Routes>
        </PostStripeSignupHandler>
      </div>
    </Router>
  );
}

export default App;
