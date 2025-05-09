import { auth } from '../firebase';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const getIdToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated.');
  }
  return await currentUser.getIdToken();
};

/**
 * Save a new conversation's summary to the history.
 * @param {object} conversationData - Data for the conversation.
 * @param {string} conversationData.threadId - The thread ID of the conversation.
 * @param {string} conversationData.title - The title of the conversation.
 * @param {string} conversationData.firstMessagePreview - Preview of the first message.
 * @param {string} conversationData.lastMessagePreview - Preview of the last message.
 * @param {string} conversationData.modelUsed - The model used for the conversation.
 * @returns {Promise<object>} - The API response.
 */
export const saveConversation = async (conversationData) => {
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/history/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(conversationData),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to save conversation.');
    }
    return responseData;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
};

/**
 * Retrieve a paginated list of the user's saved conversations.
 * @param {object} [paginationOptions] - Optional pagination parameters.
 * @param {number} [paginationOptions.page=1] - Page number.
 * @param {number} [paginationOptions.limit=15] - Items per page.
 * @param {string} [paginationOptions.sortBy="updatedAt"] - Sort field.
 * @param {string} [paginationOptions.sortOrder="desc"] - Sort order.
 * @returns {Promise<object>} - The API response.
 */
export const listConversations = async (paginationOptions = {}) => {
  try {
    const token = await getIdToken();
    const { page = 1, limit = 15, sortBy = 'updatedAt', sortOrder = 'desc' } = paginationOptions;
    const response = await fetch(`${API_BASE_URL}/history/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ page, limit, sortBy, sortOrder }),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to list conversations.');
    }
    return responseData;
  } catch (error) {
    console.error('Error listing conversations:', error);
    throw error;
  }
};

/**
 * Retrieve messages for a specific conversation.
 * @param {string} conversationId - The ID of the conversation.
 * @param {object} [options] - Optional parameters for message retrieval.
 * @param {number} [options.limit=20] - Number of messages to retrieve.
 * @param {string} [options.order='desc'] - Order of messages ('asc' or 'desc').
 * @param {string} [options.after] - Message ID to fetch messages after.
 * @returns {Promise<object>} - The API response.
 */
export const getConversationMessages = async (conversationId, options = {}) => {
  try {
    const token = await getIdToken();
    const { limit = 20, order = 'desc', after } = options;

    const requestBody = {
      conversationId,
      limit,
      order,
    };

    if (after) {
      requestBody.after = after;
    }

    const response = await fetch(`${API_BASE_URL}/history/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to get conversation messages.');
    }
    return responseData;
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    throw error;
  }
};

/**
 * Delete a specific conversation from the history.
 * @param {string} conversationId - The ID of the conversation to delete.
 * @returns {Promise<object>} - The API response.
 */
export const deleteConversation = async (conversationId) => {
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE_URL}/history/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId }),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to delete conversation.');
    }
    return responseData;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};
