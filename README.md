# Vault - Cross-Platform Password Manager
Vault is a secure, cross-platform password management solution that enables users to safely store and sync their passwords across multiple devices. Built with React Native, Expo and Firebase, it provides military-grade encryption while maintaining a seamless user experience.

### Features
- [x] User Authentication (for syncing, before masterkey generation)
- [x] Password Encryption and Decryption (XOR based encryption based on SHA256 based salt)
- [x] Passwords organized in Folders  
- [x] Password Generation (Random password generation containing alphabets(Both cases), numbers and special characters)
- [x] Syncing across multiple devices (Everything stored encrypted in Firebase Firestors)
- [x] Setting up master PIN, Biometric (fingerprint) and Face Landmark Detection
- [x] PIN verification while showing password
- [x] Copying password an username to clipboard after showing
- [ ] Fingerprint and FaceID are stored on firebase after setup but still not matched while showing password, pin is the currently the only option there
- [ ] PIN reset email
- [ ] Data Leak Alert

## Usage
install `node.js` 
Clone the repository
```bash
git clone https://github.com/HemantKumar01/Vault.git
```
Install the dependencies
```bash
npm i
```
goto `scripts/firebasConfig.js` and replace the firebaseConfig with your own firebaseConfig
```javascript
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  databaseURL:"your-database-url",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messenger-id",
  appId: "your-app-id"
};
```

Prebuild Android or IOS (For `react-native-vision-camera` to work)
```bash
npx expo run:android
npx expo run:ios
```
Run the project (after prebuilding using above commands of `npx expo prebuild`)
```bash
npm start   
```
### Screenshots
<img src="screenshots/ss 6.jpg" alt="alt text" style="max-height: 300px;"> <img src="screenshots/ss 5.jpg" alt="alt text" style="max-height: 300px;">
<img src="screenshots/ss 4.jpg" alt="alt text" style="max-height: 300px;"> <img src="screenshots/ss 3.jpg" alt="alt text" style="max-height: 300px;">
<img src="screenshots/ss 2.jpg" alt="alt text" style="max-height: 300px;"> <img src="screenshots/ss 1.jpg" alt="alt text" style="max-height: 300px;">
