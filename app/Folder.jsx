import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { decrypt } from "../scripts/encryption";
import { auth, db } from "../scripts/firebaseConfig";
import { ActivityIndicator } from "react-native";
import * as Clipboard from "expo-clipboard";

export default function FolderScreen({ route, navigation }) {
  const { folderName } = route.params;
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "You must be logged in to view passwords");
      navigation.goBack();
      return;
    }

    const passwordsRef = collection(db, "users", user.uid, "passwords");

    // Create query for passwords in the selected folder
    const folderQuery = query(
      passwordsRef,
      where("folder", "==", folderName),
      orderBy("title")
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      folderQuery,
      (snapshot) => {
        const passwordsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPasswords(passwordsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching passwords:", error);
        Alert.alert("Error", "Failed to load passwords");
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [folderName]);

  const showPassword = async (item) => {
    try {
      // In a real app, you should get this from a secure storage solution
      const masterPassword = "1234"; // Replace with actual master password retrieval
      const decryptedPassword = await decrypt(item.password, masterPassword);

      Alert.alert(
        item.title,
        `Username: ${item.username}\nPassword: ${decryptedPassword}`,
        [
          {
            text: "Copy Username",
            onPress: async () => await Clipboard.setStringAsync(item.username),
          },
          {
            text: "Copy Password",
            onPress: async () =>
              await Clipboard.setStringAsync(decryptedPassword),
          },
          {
            text: "Close",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Could not decrypt password");
      console.error(error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.passwordItem}
      onPress={() => showPassword(item)}
    >
      <Ionicons name="key" size={24} color="#4a90e2" />
      <View style={styles.passwordInfo}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.timestamp}>
          Updated: {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          navigation.navigate("EditPassword", { passwordId: item.id })
        }
      >
        <Ionicons name="pencil" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={48} color="#ccc" />
      <Text style={styles.emptyText}>No passwords in this folder</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={passwords}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={EmptyList}
        contentContainerStyle={passwords.length === 0 && styles.centerContent}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          // The onSnapshot listener will automatically refresh the data
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  passwordInfo: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  username: {
    color: "#666",
    marginTop: 2,
  },
  timestamp: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    padding: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
});
