import { auth } from '../firebase';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const sendMessage = async (userInput, threadId) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${BASE_URL}/ai/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userInput, threadId }),
    });

    const responseData = await response.json(); // Parse JSON once
    console.log('API Response:', responseData); // Log the full response data

    if (!response.ok) {
      // Use the already parsed responseData for error message
      throw new Error(responseData.message || 'Failed to send message');
    }

    return responseData; // Return the parsed data
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
