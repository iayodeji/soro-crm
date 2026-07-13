import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
// AIzaSyC_qqQ6ikif1y5556wGM6Sut5dbEQ_D_do
export const firebaseConfig = {
  apiKey: "AIzaSyC_qqQ6ikif1y5556wGM6Sut5dbEQ_D_do",
  authDomain: "soro-crm.firebaseapp.com",
  projectId: "soro-crm",
  storageBucket: "soro-crm.firebasestorage.app",
  messagingSenderId: "1009793907674",
  appId: "1:1009793907674:web:d0a837074f78e65704dee3",
  measurementId: "G-QQ6KT5HPCZ"
};

const app = initializeApp(firebaseConfig);

// Only init analytics in the browser, and only if the environment supports it
let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}

export { app, analytics };