import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
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
  getDocs,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../scripts/firebaseConfig";
export default function HomeScreen({ navigation }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "You must be logged in to view folders");
      navigation.navigate("Login"); // Assuming you have a Login screen
      return;
    }

    const foldersRef = collection(db, "users", user.uid, "folders");
    const q = query(foldersRef, orderBy("createdAt", "desc"));

    // Set up real-time listener for folders
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const folderList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setFolders(folderList);
          setLoading(false);
        } catch (error) {
          console.error("Error processing folders:", error);
          Alert.alert("Error", "Failed to load folders");
        }
      },
      (error) => {
        console.error("Error listening to folders:", error);
        Alert.alert("Error", "Failed to listen to folder updates");
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const renderFolder = ({ item }) => (
    <TouchableOpacity
      style={styles.folderItem}
      onPress={() =>
        navigation.navigate("Folder", {
          folderName: item.name,
          folderId: item.id,
        })
      }
    >
      <Ionicons name="folder" size={24} color="#4a90e2" />
      <Text style={styles.folderName}>{item.name}</Text>
      <Text style={styles.itemCount}>{item.numItems || 0} items</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading folders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {folders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No folders yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add a new folder by saving a password
          </Text>
        </View>
      ) : (
        <FlatList
          data={folders}
          renderItem={renderFolder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddPassword")}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flexGrow: 1,
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  folderName: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  itemCount: {
    color: "#888",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#4a90e2",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#666",
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: "center",
  },
});
