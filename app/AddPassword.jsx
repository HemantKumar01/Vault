import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import {
  collection,
  addDoc,
  updateDoc,
  increment,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import * as ExpoCrypto from "expo-crypto";
import { encrypt } from "../scripts/encryption";
import { auth, db } from "../scripts/firebaseConfig";

export default function AddPasswordScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [folder, setFolder] = useState("");

  const generatePassword = async () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    const randomBytes = await ExpoCrypto.getRandomBytesAsync(16);
    let generatedPassword = "";

    for (let i = 0; i < 16; i++) {
      const randomIndex = randomBytes[i] % charset.length;
      generatedPassword += charset[randomIndex];
    }

    setPassword(generatedPassword);
  };

  const updateFolders = async (userId, newFolder) => {
    try {
      // Get existing folders
      const foldersRef = collection(db, "users", userId, "folders");
      const foldersSnap = await getDocs(foldersRef);

      const existingFolders = new Set(
        foldersSnap.docs.map((doc) => doc.data().name)
      );

      // Add new folder if it doesn't exist and isn't empty
      if (newFolder && !existingFolders.has(newFolder)) {
        await addDoc(foldersRef, {
          name: newFolder,
          createdAt: new Date().toISOString(),
          numItems: 1,
        });
      } else {
        let docSnap = foldersSnap.docs.filter(
          (doc) => doc.data().name == newFolder
        )[0];
        console.log(docSnap);
        const docRef = doc(foldersRef, docSnap.id);
        await updateDoc(docRef, {
          numItems: increment(1),
        });
      }
    } catch (error) {
      console.error("Error updating folders:", error);
      throw error;
    }
  };

  const savePassword = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "You must be logged in to save passwords");
        return;
      }

      if (!title) {
        Alert.alert("Error", "Title is required");
        return;
      }

      // Get master password from your secure storage or state management
      const masterPassword = "1234"; // Replace with actual master password retrieval
      const encryptedPassword = await encrypt(password, masterPassword);

      // Check for duplicate title
      const passwordsRef = collection(db, "users", user.uid, "passwords");
      const titleQuery = query(passwordsRef, where("title", "==", title));
      const titleSnapshot = await getDocs(titleQuery);

      if (!titleSnapshot.empty) {
        Alert.alert("Error", "A password with this title already exists");
        return;
      }

      // Create new password entry
      const newEntry = {
        title,
        username,
        password: encryptedPassword,
        folder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save password
      await addDoc(passwordsRef, newEntry);

      // Update folders if a folder was specified
      if (folder) {
        await updateFolders(user.uid, folder);
      }

      Alert.alert("Success", "Password saved successfully");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save password");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Username/Email"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Folder"
        value={folder}
        onChangeText={setFolder}
      />
      <Button title="Generate Strong Password" onPress={generatePassword} />
      <View style={styles.spacer} />
      <Button title="Save Password" onPress={savePassword} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  spacer: {
    height: 20,
  },
});
``;
