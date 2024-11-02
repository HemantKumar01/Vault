import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from "react-native-vision-camera";
import * as LocalAuthentication from "expo-local-authentication";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { auth, db } from "../scripts/firebaseConfig.js";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Buffer } from "buffer";
import { runOnJS } from "react-native-reanimated";
import { Face } from "@react-native-ml-kit/face-detection";

const storage = getStorage(app);

const FaceVerificationScreen = () => {
  const camera = useRef(null);
  const devices = useCameraDevices();
  const device = devices.front;

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(1); // 1: PIN, 2: Fingerprint, 3: Face Registration
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [faceTemplates, setFaceTemplates] = useState([]);
  const [isRegistering, setIsRegistering] = useState(true);

  useEffect(() => {
    checkBiometricHardware();
    checkCameraPermission();
  }, []);

  const checkBiometricHardware = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setHasBiometricHardware(compatible);
  };

  const checkCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === "authorized");
  };

  const validatePin = () => {
    if (pin.length < 6) {
      Alert.alert("Error", "PIN must be at least 6 digits");
      return false;
    }
    if (pin !== confirmPin) {
      Alert.alert("Error", "PINs do not match");
      return false;
    }
    return true;
  };

  const setupFingerprint = async () => {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Scan your fingerprint to register",
        disableDeviceFallback: true,
      });

      if (biometricAuth.success) {
        const userId = auth.currentUser.uid;
        await setDoc(
          doc(db, "userBiometrics", userId),
          {
            hasBiometricEnabled: true,
            pin: pin,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );

        setStep(3);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to enroll fingerprint");
    }
  };

  // Function to extract face features from the detected face
  const extractFaceFeatures = (face) => {
    return {
      leftEyePosition: face.leftEyePosition,
      rightEyePosition: face.rightEyePosition,
      noseBasePosition: face.noseBasePosition,
      bottomMouthPosition: face.bottomMouthPosition,
      leftMouthPosition: face.leftMouthPosition,
      rightMouthPosition: face.rightMouthPosition,
      landmarks: face.landmarks,
      contours: face.contours,
      angles: {
        roll: face.headEulerAngleZ,
        pitch: face.headEulerAngleX,
        yaw: face.headEulerAngleY,
      },
    };
  };

  // Function to calculate similarity between face templates
  const calculateFaceSimilarity = (template1, template2) => {
    // Calculate Euclidean distance between landmark points
    let totalDistance = 0;
    let pointCount = 0;

    // Compare facial landmarks
    for (const key in template1.landmarks) {
      if (template1.landmarks[key] && template2.landmarks[key]) {
        const dx = template1.landmarks[key].x - template2.landmarks[key].x;
        const dy = template1.landmarks[key].y - template2.landmarks[key].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        pointCount++;
      }
    }

    // Compare face angles
    const angleDiff =
      Math.abs(template1.angles.roll - template2.angles.roll) +
      Math.abs(template1.angles.pitch - template2.angles.pitch) +
      Math.abs(template1.angles.yaw - template2.angles.yaw);

    // Calculate final similarity score (0 to 1)
    const landmarkScore =
      pointCount > 0 ? 1 - totalDistance / (pointCount * 100) : 0;
    const angleScore = 1 - angleDiff / 180;

    return landmarkScore * 0.7 + angleScore * 0.3; // Weighted average
  };

  const processFaceDetection = async (faces) => {
    if (!isProcessing && faces.length === 1) {
      setIsProcessing(true);
      const face = faces[0];

      // Check face angle and quality
      const { headEulerAngleY, headEulerAngleZ } = face;
      if (Math.abs(headEulerAngleY) > 20 || Math.abs(headEulerAngleZ) > 20) {
        setIsProcessing(false);
        return; // Face is not front-facing enough
      }

      const faceFeatures = extractFaceFeatures(face);

      if (isRegistering) {
        // Registration mode
        setFaceTemplates((prev) => [...prev, faceFeatures]);
        setRegistrationProgress((prev) => prev + 20);

        if (faceTemplates.length >= 4) {
          // We have enough templates, store them
          try {
            const userId = auth.currentUser.uid;
            await setDoc(
              doc(db, "userBiometrics", userId),
              {
                faceTemplates: faceTemplates,
                faceRegistrationCompleted: true,
                lastUpdated: new Date().toISOString(),
              },
              { merge: true }
            );

            Alert.alert("Success", "Face registration completed!");
            setIsRegistering(false);
          } catch (error) {
            Alert.alert("Error", "Failed to store face templates");
          }
        }
      } else {
        // Verification mode
        const storedTemplates = await getStoredFaceTemplates();
        if (storedTemplates) {
          const matchScores = storedTemplates.map((template) =>
            calculateFaceSimilarity(faceFeatures, template)
          );

          const bestMatch = Math.max(...matchScores);
          if (bestMatch > 0.8) {
            // Threshold for match
            // Verification successful
            Alert.alert("Success", "Face verified successfully!");
          } else {
            Alert.alert("Error", "Face verification failed");
          }
        }
      }

      setIsProcessing(false);
    }
  };

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!isProcessing) {
        const faces = Face.detectFaces(frame, {
          performanceMode: "accurate",
          landmarkMode: "all",
          contourMode: "all",
        });
        runOnJS(processFaceDetection)(faces);
      }
    },
    [isProcessing, isRegistering, faceTemplates]
  );

  // Render functions for different steps
  const renderPinSetup = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Set up PIN</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter PIN"
        keyboardType="numeric"
        secureTextEntry
        value={pin}
        onChangeText={setPin}
        maxLength={6}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm PIN"
        keyboardType="numeric"
        secureTextEntry
        value={confirmPin}
        onChangeText={setConfirmPin}
        maxLength={6}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => validatePin() && setStep(2)}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFingerprintSetup = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Set up Fingerprint</Text>
      {hasBiometricHardware ? (
        <TouchableOpacity style={styles.button} onPress={setupFingerprint}>
          <Text style={styles.buttonText}>Scan Fingerprint</Text>
        </TouchableOpacity>
      ) : (
        <Text>Fingerprint hardware not available</Text>
      )}
    </View>
  );

  const renderFaceSetup = () => {
    if (!device) return <ActivityIndicator size="large" />;

    return (
      <View style={styles.container}>
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {isRegistering
              ? `Keep your face centered (Progress: ${registrationProgress}%)`
              : "Look at the camera for verification"}
          </Text>
          {isProcessing && <ActivityIndicator size="large" color="#fff" />}
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderPinSetup();
      case 2:
        return renderFingerprintSetup();
      case 3:
        return renderFaceSetup();
      default:
        return null;
    }
  };

  return <View style={styles.mainContainer}>{renderCurrentStep()}</View>;
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  progress: {
    width: "80%",
    height: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
    marginTop: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
});

export default FaceVerificationScreen;
