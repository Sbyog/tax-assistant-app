import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';
import AccountPage from './pages/AccountPage';
import SignupModal from './components/SignupModal';
import { auth } from './firebase';
import { onAuthStateChanged } from "firebase/auth";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoadingAuth(true); // Set loading true while we check Firestore etc.
        try {
          const existsInFirestore = await checkIfUserExists(user.uid);

          const storedFirstName = localStorage.getItem('signupFirstName');
          const storedLastName = localStorage.getItem('signupLastName');
          const storedEmail = localStorage.getItem('signupEmail');
          const storedUid = localStorage.getItem('signupUid');

          if (!existsInFirestore) {
            if (storedUid === user.uid && storedFirstName && storedLastName && storedEmail) {
              // User is authenticated, not in Firestore, but has localStorage details.
              // This means they are returning from Stripe successfully.
              console.log('App.js: User returning from Stripe, setting isCompletingPostStripeSignup to true.');
              setCurrentUser(user); // Set current user to allow navigation to protected routes like /subscription/success
              setIsCompletingPostStripeSignup(true);
              // SubscriptionSuccess page will handle Firestore creation and clearing localStorage.
              // setLoadingAuth will be set to false by PostStripeSignupHandler or when isCompletingPostStripeSignup is false.
              // No need to set loadingAuth false here immediately, let the handler/redirect do its job.
            } else {
              // Standard new user, show the modal to collect names.
              console.log('App.js: New user, showing signup modal.');
              setPendingSignupDetails(user);
              setShowSignupModal(true);
              setCurrentUser(null); // Don't set full currentUser yet
              setIsCompletingPostStripeSignup(false);
              setLoadingAuth(false); // Modal will be shown, auth process for now is paused for this user.
            }
          } else {
            // User exists in Firestore, proceed as normal.
            console.log('App.js: Existing user, proceeding to login.');
            await updateUserLastLogin(user.uid);
            setIsNewUser(false); // Not a new Firestore user
            setCurrentUser(user);
            setShowSignupModal(false);
            setPendingSignupDetails(null);
            setIsCompletingPostStripeSignup(false); // Ensure this is false for existing users
            // Clear any potentially lingering signup items from localStorage for existing users
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
        // User is signed out
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
  }, []); // Removed isCompletingPostStripeSignup from deps, onAuthStateChanged handles all states

  const handleModalCancel = () => {
    setShowSignupModal(false);
    setPendingSignupDetails(null);
    // auth.signOut() is handled within SignupModal's cancel
    // onAuthStateChanged will then set loadingAuth to false and currentUser to null.
  };

  // This effect ensures loadingAuth is false if we are not in a special loading state.
  useEffect(() => {
    if (!isCompletingPostStripeSignup && !showSignupModal && currentUser === null && auth.currentUser === null) {
      // This case covers when modal is cancelled, user signs out, and we are not waiting for Stripe.
      setLoadingAuth(false);
    } else if (currentUser && !isCompletingPostStripeSignup) {
      // User is logged in and not in post-stripe flow.
      setLoadingAuth(false);
    }
    // If isCompletingPostStripeSignup is true, loadingAuth remains true until navigation to success page
    // or until isCompletingPostStripeSignup becomes false.
    // If showSignupModal is true, loadingAuth was set false in onAuthStateChanged.

  }, [isCompletingPostStripeSignup, showSignupModal, currentUser]);

  if (loadingAuth && !showSignupModal && !isCompletingPostStripeSignup) {
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
    </Router>
  );
}

export default App;
