import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCvQyAG7LgzNdY1usEHmotUqXH44eYpHjM',
  authDomain: 'mapty-6cfaa.firebaseapp.com',
  projectId: 'mapty-6cfaa',
  storageBucket: 'mapty-6cfaa.firebasestorage.app',
  messagingSenderId: '32247320501',
  appId: '1:32247320501:web:90150b0d44a31adb5d13fc',
  measurementId: 'G-X5MBNSBDE7',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
