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
 * @returns {Promise<void>}
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
    console.log('User created via API:', user.uid);
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
      return null; // User not found
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Error getting user data via API: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting user data via API:', error);
    throw error;
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