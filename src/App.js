import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage'; // Import LoginPage
import { auth } from './firebase'; // Initialize Firebase
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  if (loadingAuth) {
    // Optional: Add a loading spinner or a blank page while checking auth state
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading...</p> {/* Replace with a proper spinner component if desired */}
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={currentUser ? <Home /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/login" 
          element={!currentUser ? <LoginPage /> : <Navigate to="/" replace />} 
        />
        {/* You can add more routes here that require authentication */}
        {/* For example:
        <Route 
          path="/dashboard" 
          element={currentUser ? <Dashboard /> : <Navigate to="/login" replace />} 
        /> 
        */}
      </Routes>
    </Router>
  );
}

export default App;
