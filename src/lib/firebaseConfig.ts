// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyC_qqQ6ikif1y5556wGM6Sut5dbEQ_D_do",
  authDomain: "soro-crm.firebaseapp.com",
  projectId: "soro-crm",
  storageBucket: "soro-crm.firebasestorage.app",
  messagingSenderId: "1009793907674",
  appId: "1:1009793907674:web:d0a837074f78e65704dee3",
  measurementId: "G-QQ6KT5HPCZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
