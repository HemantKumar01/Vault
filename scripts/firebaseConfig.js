import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Optionally import the services that you want to use
// import {...} from "firebase/auth";
// import {...} from "firebase/database";
// import {...} from "firebase/firestore";
// import {...} from "firebase/functions";
// import {...} from "firebase/storage";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBs_OgQxibXXMXqmb1MzWfVI_OARvgThok",
  authDomain: "testing-ff0e3.firebaseapp.com",
  databaseURL:
    "https://testing-ff0e3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "testing-ff0e3",
  storageBucket: "testing-ff0e3.appspot.com",
  messagingSenderId: "619833076225",
  appId: "1:619833076225:web:a9db974e3fa32d68046e00",
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
