import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PaperProvider } from "react-native-paper";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../scripts/firebaseConfig";
import { ActivityIndicator } from "react-native";
import HomeScreen from "./Home";
import LoginScreen from "./Login";
import SignUpScreen from "./Signup";
import AddPasswordScreen from "./AddPassword";
import FolderScreen from "./Folder";
import applyGlobalPolyfills from "../scripts/polyfills";
// import SettingsScreen from "./SettingsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    applyGlobalPolyfills();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      {user ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Password Manager" }}
          />
          <Stack.Screen
            name="AddPassword"
            component={AddPasswordScreen}
            options={{ title: "Add New Password" }}
          />
          <Stack.Screen
            name="Folder"
            component={FolderScreen}
            options={({ route }) => ({ title: route.params.folderName })}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
