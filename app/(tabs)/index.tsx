import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Pressable,
  Image,
  Alert,
  FlatList,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hiddenImages, setHiddenImages] = useState<string[]>([]);

  const hiddenDir = FileSystem.documentDirectory + 'hidden/';

  // Load hidden images from the hidden directory
  const loadHiddenImages = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(hiddenDir);
      const imageUris = files.map((file) => hiddenDir + file);
      setHiddenImages(imageUris);
    } catch (error) {
      console.log('Error loading images:', error);
    }
  };

  // Pick image from gallery and hide (copy) it
  const pickAndHideImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed to access gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;
      const fileName = originalUri.split('/').pop() || `img_${Date.now()}.jpg`;
      const hiddenPath = hiddenDir + fileName;

      await FileSystem.makeDirectoryAsync(hiddenDir, { intermediates: true });
      await FileSystem.copyAsync({ from: originalUri, to: hiddenPath });

      await loadHiddenImages();
      Alert.alert('Image hidden successfully!');
    }
  };

  // Delete image confirmation and delete file
  const deleteImage = async (uri: string) => {
    Alert.alert('Delete Image', 'Are you sure you want to delete this image?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(uri);
            await loadHiddenImages();
          } catch (error) {
            Alert.alert('Failed to delete image');
          }
        },
      },
    ]);
  };

  // Biometric authentication function
  const authenticateBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Your device does not support biometric authentication');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'No biometric credentials found. Please set up fingerprint or face recognition on your device.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setIsAuthenticated(true);
        loadHiddenImages();
      } else {
        Alert.alert('Authentication failed or cancelled');
      }
    } catch (e: any) {
      Alert.alert('Authentication error', e.message);
    }
  };

  // If not authenticated, show biometric unlock button
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔒 Unlock with Biometrics</Text>
        <Button title="Unlock" onPress={authenticateBiometrics} />
      </View>
    );
  }

  // If authenticated, show hidden gallery
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📂 Hidden Gallery</Text>
      <Button title="Pick & Hide Image" onPress={pickAndHideImage} />

      <FlatList
        data={hiddenImages}
        keyExtractor={(item) => item}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable onPress={() => deleteImage(item)}>
            <Image source={{ uri: item }} style={styles.image} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  grid: {
    marginTop: 20,
  },
  image: {
    width: 150,
    height: 150,
    margin: 8,
    borderRadius: 10,
  },
});
