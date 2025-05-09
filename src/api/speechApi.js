
import { auth } from '../firebase';

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

/**
 * Sends audio blob to the backend for transcription.
 * @param {Blob} audioBlob - The audio data to transcribe.
 * @param {string} [language] - Optional language hint (e.g., 'en').
 * @returns {Promise<string|null>} - The transcribed text or null on error.
 */
export const transcribeAudio = async (audioBlob, language) => {
  if (!auth.currentUser) {
    console.error('User not authenticated for transcription.');
    throw new Error('User not authenticated');
  }

  const firebaseIdToken = await auth.currentUser.getIdToken();
  const formData = new FormData();
  formData.append('audioFile', audioBlob, 'user_audio.webm'); // Filename with extension is good practice

  if (language) {
    formData.append('language', language);
  }

  try {
    const response = await fetch(`${BASE_URL}/ai/speech-to-text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseIdToken}`,
        // 'Content-Type' for FormData is set automatically by the browser
      },
      body: formData,
    });

    const result = await response.json();

    if (response.ok && result.success && result.data && typeof result.data.text === 'string') {
      console.log('Transcription:', result.data.text);
      return result.data.text;
    } else {
      console.error('Speech-to-text API error:', result.error || result.message || 'Unknown error from API');
      throw new Error(result.error || result.message || 'Failed to transcribe audio');
    }
  } catch (error) {
    console.error('Network or other error during speech-to-text:', error);
    throw error; // Re-throw to be caught by the caller
  }
};
