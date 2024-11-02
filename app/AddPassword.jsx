import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native";
import {
  collection,
  addDoc,
  updateDoc,
  increment,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import * as ExpoCrypto from "expo-crypto";
import { encrypt } from "../scripts/encryption";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../scripts/firebaseConfig";

export default function AddPasswordScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [folder, setFolder] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const generatePassword = async () => {
    const charset = {
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      numbers: "0123456789",
      special: "!@#$%^&*()_+",
    };

    // Get one random character from each required category
    let generatedPassword =
      charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)] +
      charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)] +
      charset.numbers[Math.floor(Math.random() * charset.numbers.length)] +
      charset.special[Math.floor(Math.random() * charset.special.length)];

    // Generate additional characters to complete the password length
    const allChars =
      charset.uppercase + charset.lowercase + charset.numbers + charset.special;
    const randomBytes = await ExpoCrypto.getRandomBytesAsync(12); // 12 more for a total of 16

    for (let i = 0; i < 12; i++) {
      const randomIndex = randomBytes[i] % allChars.length;
      generatedPassword += allChars[randomIndex];
    }

    // Shuffle the password to randomize the position of each character
    generatedPassword = generatedPassword
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

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
  const getMasterKey = () => {
    return new Promise(async (resolve, reject) => {
      const userDoc = await getDoc(doc(db, "userBiometrics", currentUser.uid));
      const userData = userDoc.data();
      if (!userData) {
        reject("User biometrics not found");
      }
      resolve(userData.pin);
    });
  };
  const savePassword = async () => {
    try {
      const user = auth.currentUser;
      if (!(title && password && username && folder)) {
        Alert.alert("Error", "All fields are required");
        return;
      }
      if (!user) {
        Alert.alert("Error", "You must be logged in to save passwords");
        return;
      }

      const masterPassword = await getMasterKey();

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
      <View>
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
        />
        <View
          style={{
            position: "absolute",
            right: 10,
            top: "30%",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setIsPasswordVisible(!isPasswordVisible);
            }}
          >
            {isPasswordVisible ? (
              <Ionicons name="eye" size={24} color="#4a90e2" />
            ) : (
              <Ionicons name="eye-off" size={24} color="#4a90e2" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.generatePassword}
        onPress={generatePassword}
      >
        <Text
          style={{
            color: "#4a90e2",
            textAlign: "right",
          }}
        >
          Generate Strong Password
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Folder"
        value={folder}
        onChangeText={setFolder}
      />
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
    marginVertical: 10,
    borderRadius: 5,
  },
  spacer: {
    height: 20,
  },
  generatePassword: {
    marginVertical: 10,
    backgroundColor: "",
    marginTop: -5,
  },
});
