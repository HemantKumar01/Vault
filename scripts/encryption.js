import * as Crypto from "expo-crypto";
import { encode as encodeBase64, decode as decodeBase64 } from "base-64";

// Generate a key using available crypto functions
export const generateKey = async (password, salt) => {
  const keyMaterial = password + salt;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    keyMaterial
  );
};

export const encrypt = async (text, password) => {
  try {
    // Generate a compact salt (8 bytes is sufficient for most uses)
    const salt = Array.from(await Crypto.getRandomBytesAsync(8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const key = await generateKey(password, salt);

    // Convert text directly to bytes
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);

    // Encrypt using XOR
    const encrypted = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    // Use a more compact encoding
    const encryptedHex = Array.from(encrypted)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Format: salt:encryptedHex
    return `${salt}:${encryptedHex}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
};

export const decrypt = async (encryptedData, password) => {
  try {
    const [salt, encryptedHex] = encryptedData.split(":");
    const key = await generateKey(password, salt);

    // Convert hex to bytes
    const encrypted = new Uint8Array(
      encryptedHex.match(/.{2}/g).map((byte) => parseInt(byte, 16))
    );
    const keyBytes = new TextEncoder().encode(key);

    // Decrypt using XOR
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
};

// Helper function to check if the encrypted size is within SecureStore limits
export const getEncryptedSize = (encryptedString) => {
  return new TextEncoder().encode(encryptedString).length;
};
