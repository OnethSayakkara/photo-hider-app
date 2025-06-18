import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  Alert,
  FlatList,
  StyleSheet,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function App() {
  const SECRET_HOUR = 3;
  const SECRET_MINUTE = 15;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(true);
  const [hiddenImages, setHiddenImages] = useState<string[]>([]);

  const hiddenDir = FileSystem.documentDirectory + 'hidden/';

  const loadHiddenImages = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(hiddenDir);
      const imageUris = files.map((file) => hiddenDir + file);
      setHiddenImages(imageUris);
    } catch (error) {
      console.log('Error loading images:', error);
    }
  };

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

  const handleClockUnlock = () => {
    const hour = selectedTime.getHours();
    const minute = selectedTime.getMinutes();

    if (hour === SECRET_HOUR && minute === SECRET_MINUTE) {
      setIsAuthenticated(true);
      loadHiddenImages();
    } else {
      Alert.alert('Wrong time! Try again ⏰');
    }
  };

  // ⏰ Clock Lock Screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🕒 Set the Secret Time</Text>

        {showPicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'android' ? 'clock' : 'spinner'}
            onChange={(event, date) => {
              if (date) setSelectedTime(date);
            }}
          />
        )}

        <View style={{ marginTop: 20 }}>
          <Button title="Unlock" onPress={handleClockUnlock} />
        </View>
      </View>
    );
  }

  // ✅ Hidden Gallery View
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
          <Image source={{ uri: item }} style={styles.image} />
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
