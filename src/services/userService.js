import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Check if a user exists in the Firestore users collection
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<boolean>} - Whether the user exists in Firestore
 */
export const checkIfUserExists = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

/**
 * Create a new user document in Firestore
 * @param {object} user - Firebase Auth user object
 * @returns {Promise<void>}
 */
export const createUserInFirestore = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: new Date(),
      lastLogin: new Date(),
    });
    console.log('User created in Firestore:', user.uid);
  } catch (error) {
    console.error('Error creating user in Firestore:', error);
    throw error;
  }
};

/**
 * Update user's last login timestamp
 * @param {string} userId - Firebase Auth user ID
 * @returns {Promise<void>}
 */
export const updateUserLastLogin = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
  } catch (error) {
    console.error('Error updating user last login:', error);
    throw error;
  }
};