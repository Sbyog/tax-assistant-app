import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';
import AccountPage from './pages/AccountPage'; // Add this import
import { auth } from './firebase';
import { onAuthStateChanged } from "firebase/auth";
import { checkIfUserExists, createUserInFirestore, updateUserLastLogin } from './services/userService';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        try {
          const existsInFirestore = await checkIfUserExists(user.uid);
          
          if (!existsInFirestore) {
            // User doesn't exist in Firestore, create new record
            await createUserInFirestore(user);
            setIsNewUser(true);
          } else {
            // User exists, update last login
            await updateUserLastLogin(user.uid);
            setIsNewUser(false);
          }
        } catch (error) {
          console.error("Error in user Firestore operations:", error);
          // Still set the user even if Firestore operations fail
        }
      } else {
        // User is signed out
        setIsNewUser(false);
      }
      
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  if (loadingAuth) {
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
      <Routes>
        <Route 
          path="/" 
          element={currentUser ? <Home isNewUser={isNewUser} user={currentUser} /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/login" 
          element={!currentUser ? <LoginPage /> : <Navigate to="/" replace />} 
        />
        <Route
          path="/subscription/success"
          element={currentUser ? <SubscriptionSuccess /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/subscription/cancel"
          element={currentUser ? <SubscriptionCancel /> : <Navigate to="/login" replace />}
        />
        <Route // Add this new route
          path="/account"
          element={currentUser ? <AccountPage user={currentUser} /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
