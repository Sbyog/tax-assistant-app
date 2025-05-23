import { auth } from '../firebase'; // Import auth to get ID token

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Helper function to get Firebase ID token
 */
const getIdToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated.');
  }
  return await currentUser.getIdToken();
};

/**
 * Check if a user exists via API
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<boolean>} - Whether the user exists
 */
export const checkIfUserExists = async (userId) => {
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/auth/users/exists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Error checking user existence via API:', errorData);
      throw new Error(errorData.message || `Error checking user existence: ${response.status}`);
    }
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking if user exists via API:', error);
    throw error;
  }
};

/**
 * Create a new user document via API
 * @param {object} user - Firebase Auth user object
 * @returns {Promise<object>} - The created user data from the backend
 */
export const createUserInFirestore = async (user) => {
  try {
    const token = await getIdToken();
    const payload = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
    };
    const response = await fetch(`${API_BASE_URL}/auth/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Error creating user via API: ${response.status}`);
    }
    // Assuming 201 Created or similar success status
    const createdUserData = await response.json();
    console.log('User created via API, full response:', createdUserData); 
    if (createdUserData && createdUserData.user) {
      console.log('Returning user object from response:', createdUserData.user);
      return createdUserData.user; // Return the nested user object
    } else {
      // This case should ideally be caught by !response.ok, but as a safeguard:
      throw new Error('User creation response did not contain user data.');
    }
  } catch (error) {
    console.error('Error creating user via API:', error);
    throw error;
  }
};

/**
 * Update user's last login timestamp via API
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<void>}
 */
export const updateUserLastLogin = async (userId) => {
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/auth/users/last-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Error updating last login via API: ${response.status}`);
    }
    // Assuming 200 OK or 204 No Content
  } catch (error) {
    console.error('Error updating user last login via API:', error);
    throw error;
  }
};

/**
 * Get user data from API
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<object|null>} - User data or null if not found (or throw error)
 */
export const getUserData = async (userId) => {
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/auth/users/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (response.status === 404) {
      console.log(`getUserData: User ${userId} not found (404).`);
      return null; // User not found
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.warn(`Warning getting user data via API for ${userId}: ${response.status}`, errorData.message);
      return null; 
    }
    const responseData = await response.json();
    console.log(`getUserData: Raw response for ${userId}:`, responseData);

    // Check if the actual user data is nested under a 'user' property
    if (responseData && responseData.user && typeof responseData.user === 'object') {
      console.log(`getUserData: Returning nested user object for ${userId}:`, responseData.user);
      return responseData.user;
    } 
    // Check if the data is directly the user object (and has a uid)
    else if (responseData && responseData.uid) {
      console.log(`getUserData: Returning direct response object as user data for ${userId}:`, responseData);
      return responseData;
    }
    // If the structure is unexpected (e.g., not an object, or missing uid after potential unnesting)
    else {
      console.warn(`getUserData: Response for ${userId} is not in the expected format or lacks uid. Data:`, responseData);
      return null; // Or handle as an error, depending on strictness required
    }
  } catch (error) {
    console.error(`Error getting user data via API for ${userId}:`, error);
    return null; 
  }
};

/**
 * Marks the tutorial as completed for the user via API.
 * @param {string} userId - Firebase Auth user ID (used for logging, not sent in body)
 * @returns {Promise<void>}
 */
export const markTutorialAsCompleted = async (userId) => {
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/auth/users/update`, { // Updated endpoint URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tutorialCompleted: true }), // Correct body
    });

    const responseData = await response.json(); // Parse JSON response

    if (!response.ok || !responseData.success) {
      // If response is not OK or backend indicates failure
      throw new Error(responseData.message || `Error marking tutorial as completed: ${response.status}`);
    }
    
    console.log(responseData.message || 'Tutorial marked as completed for user:', userId);
  } catch (error) {
    console.error('Error marking tutorial as completed:', error.message);
    // We don't re-throw here to avoid breaking the app flow if this minor update fails,
    // but you might want to add more robust error handling or retry logic.
  }
};

/**
 * Update user's Stripe customer ID
 * @param {string} userId - Firebase Auth user ID
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<void>}
 */
// export const updateStripeCustomerId = async (userId, customerId) => {
//   try {
//     const token = await getIdToken();
//     const response = await fetch(`${API_BASE_URL}/auth/users/stripe-customer-id`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`,
//       },
//       body: JSON.stringify({ userId, customerId }),
//     });

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({ message: response.statusText }));
//       throw new Error(errorData.message || `Error updating Stripe customer ID via API: ${response.status}`);
//     }
//     // Assuming 200 OK or 204 No Content
//   } catch (error) {
//     console.error('Error updating Stripe customer ID via API:', error);
//     throw error;
//   }
// };