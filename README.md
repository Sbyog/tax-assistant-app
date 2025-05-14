# Solara: Your Pocket Communicaion Coach

A React.js application for AI tools with Firebase integration.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
   
   If you encounter ENOSPC (no space left on device) errors:
   ```
   # Clean up npm cache
   npm cache clean --force
   
   # Try installing with fewer dependencies
   npm install --no-optional
   
   # If issues persist, use the clean scripts
   npm run clean:all
   npm install
   ```
   
3. Create a `.env` file in the root directory with the following variables:
   ```
   # App Configuration
   PORT=3000

   # Firebase Configuration
   REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
   REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
   REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID
   ```
4. Replace the Firebase configuration values in `.env` with your own Firebase project details
5. Start the development server:
   ```
   npm start
   ```

## Features (Planned)

- User authentication
- Real-time messaging
- File storage

## Technologies

- React.js
- Tailwind CSS
- Firebase (Authentication, Firestore, Storage, Messaging)

## Troubleshooting

If you encounter disk space issues during installation:
1. Check available disk space on your system
2. Clear npm cache: `npm cache clean --force`
3. Use the provided cleanup scripts: `npm run clean` or `npm run clean:all`
4. Consider moving your npm cache to an external drive:
   ```
   npm config set cache /path/to/external/drive/.npm --global
   ```
