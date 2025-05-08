import { auth } from '../firebase';

// Get API base URL from environment variable or fallback to default
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

/**
 * Create a checkout session for subscription
 * @returns {Promise<{success: boolean, url: string, error: string}>} 
 */
export const createCheckoutSession = async () => {
  try {
    // Get the user's Firebase token
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to subscribe');
    }

    const token = await currentUser.getIdToken();
    
    const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: currentUser.email,
        userId: currentUser.uid,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancel`,
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        url: data.url,
        error: null
      };
    } else {
      return {
        success: false,
        url: null,
        error: data.error || 'Failed to create checkout session'
      };
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      success: false,
      url: null,
      error: error.message || 'An unknown error occurred'
    };
  }
};

/**
 * Open the customer portal to manage subscription
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<{success: boolean, url: string, error: string}>}
 */
export const openCustomerPortal = async (customerId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to manage subscription');
    }

    const token = await currentUser.getIdToken();
    
    const response = await fetch(`${API_BASE_URL}/payments/create-customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: currentUser.uid,
        returnUrl: `${window.location.origin}/account`,
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        url: data.url,
        error: null
      };
    } else {
      return {
        success: false,
        url: null,
        error: data.error || 'Failed to open customer portal'
      };
    }
  } catch (error) {
    console.error('Error opening customer portal:', error);
    return {
      success: false,
      url: null,
      error: error.message || 'An unknown error occurred'
    };
  }
};

/**
 * Check if a user has an active subscription
 * @param {string} uid - Firebase user ID
 * @returns {Promise<{success: boolean, status: string, error: string}>}
 */
export const checkSubscriptionStatus = async (uid) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== uid) {
      throw new Error('User must be logged in to check subscription');
    }

    const token = await currentUser.getIdToken();
    
    const response = await fetch(`${API_BASE_URL}/payments/subscription/${uid}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        status: data.status || 'none',
        error: null
      };
    } else {
      return {
        success: false,
        status: 'error',
        error: data.error || 'Failed to check subscription status'
      };
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      success: false,
      status: 'error',
      error: error.message || 'An unknown error occurred'
    };
  }
};