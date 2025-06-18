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
  TextInput,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export default function App() {
  const [display, setDisplay] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hiddenImages, setHiddenImages] = useState<string[]>([]);
  const correctPin = '1234';
  const hiddenDir = FileSystem.cacheDirectory + 'hidden/';
  const [firstNumber, setFirstNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [secondNumber, setSecondNumber] = useState('');

  // Create .nomedia file for Android to prevent media scanning
  const createNoMediaFile = async () => {
    if (Platform.OS === 'android') {
      const noMediaFile = hiddenDir + '.nomedia';
      try {
        await FileSystem.writeAsStringAsync(noMediaFile, '');
      } catch (error) {
        console.log('Error creating .nomedia file:', error);
      }
    }
  };

  // Load hidden images from the hidden directory
  const loadHiddenImages = async () => {
    try {
      await FileSystem.makeDirectoryAsync(hiddenDir, { intermediates: true });
      await createNoMediaFile();
      const files = await FileSystem.readDirectoryAsync(hiddenDir);
      const imageUris = files
        .filter((file) => file !== '.nomedia')
        .map((file) => hiddenDir + file);
      setHiddenImages(imageUris);
    } catch (error) {
      console.log('Error loading images:', error);
    }
  };

  // Pick image from gallery and hide (move) it
  const pickAndHideImage = async () => {
    // Request media library permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed to access and hide photos');
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

      try {
        await FileSystem.makeDirectoryAsync(hiddenDir, { intermediates: true });
        await createNoMediaFile();

        // Attempt to move the original photo
        await FileSystem.moveAsync({ from: originalUri, to: hiddenPath });
        await loadHiddenImages();
        Alert.alert('Image hidden successfully!');
      } catch (error) {
        console.log('Error moving image:', error);
        // Fallback: Copy the image and alert user
        try {
          await FileSystem.copyAsync({ from: originalUri, to: hiddenPath });
          await loadHiddenImages();
          Alert.alert(
            'Image hidden in app',
            Platform.OS === 'ios'
              ? 'Original photo could not be removed from Photos. Please delete it manually.'
              : 'Original photo could not be moved due to permissions. Please delete it manually from your gallery.'
          );
        } catch (copyError) {
          console.log('Error copying image:', copyError);
          Alert.alert('Failed to hide image');
        }
      }
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

  // Perform calculation
  const calculate = () => {
    if (!firstNumber || !operator || !secondNumber) return;

    const num1 = parseFloat(firstNumber);
    const num2 = parseFloat(secondNumber);
    let result = 0;

    switch (operator) {
      case '+':
        result = num1 + num2;
        break;
      case '-':
        result = num1 - num2;
        break;
      case '*':
        result = num1 * num2;
        break;
      case '/':
        if (num2 === 0) {
          Alert.alert('Error', 'Division by zero');
          return;
        }
        result = num1 / num2;
        break;
      case '%':
        result = (num1 * num2) / 100;
        break;
      default:
        return;
    }

    setDisplay(result.toString());
    setFirstNumber(result.toString());
    setSecondNumber('');
    setOperator('');
  };

  // Handle button press
  const handlePress = (value: string) => {
    if (value === 'AC') {
      setDisplay('');
      setFirstNumber('');
      setSecondNumber('');
      setOperator('');
    } else if (value === 'C') {
      setDisplay(display.slice(0, -1));
      if (secondNumber) {
        setSecondNumber(secondNumber.slice(0, -1));
      } else if (operator) {
        setOperator('');
      } else if (firstNumber) {
        setFirstNumber(firstNumber.slice(0, -1));
      }
    } else if (value === '=') {
      if (firstNumber === correctPin && !operator && !secondNumber) {
        setIsAuthenticated(true);
        setDisplay('');
        setFirstNumber('');
        setSecondNumber('');
        setOperator('');
        loadHiddenImages();
        return;
      }
      calculate();
    } else if (['+', '-', '*', '/', '%'].includes(value)) {
      if (firstNumber && !operator && !secondNumber) {
        setOperator(value);
        setDisplay(display + value);
      }
    } else if (value === '.') {
      const current = operator ? secondNumber : firstNumber;
      if (!current.includes('.')) {
        if (operator) {
          setSecondNumber(secondNumber + value);
        } else {
          setFirstNumber(firstNumber + value);
        }
        setDisplay(display + value);
      }
    } else {
      if (operator) {
        setSecondNumber(secondNumber + value);
      } else {
        setFirstNumber(firstNumber + value);
      }
      setDisplay(display + value);
    }
  };

  // Calculator button layout
  const buttons = [
    ['AC', 'C', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', 'span2'],
  ];

  // If not authenticated, show calculator
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔒 Calculator</Text>
        <TextInput
          style={styles.display}
          value={display}
          editable={false}
          placeholder="0"
          placeholderTextColor="#888"
        />
        <View style={styles.calculator}>
          {buttons.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.buttonRow}>
              {row.map((button, btnIndex) => (
                button !== 'span2' && (
                  <Pressable
                    key={button}
                    style={({ pressed }) => [
                      styles.calculatorButton,
                      pressed && styles.buttonPressed,
                      button === '0' && rowIndex === 4 && styles.zeroButton,
                      ['AC', 'C'].includes(button) && styles.clearButton,
                      ['%', '/', '*', '-', '+', '.'].includes(button) && styles.operatorButton,
                      button === '=' && styles.equalsButton,
                    ]}
                    onPress={() => handlePress(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        ['AC', 'C'].includes(button) && styles.clearButtonText,
                        ['%', '/', '*', '-', '+', '.'].includes(button) && styles.operatorButtonText,
                        button === '=' && styles.equalsButtonText,
                      ]}
                    >
                      {button}
                    </Text>
                  </Pressable>
                )
              ))}
              {rowIndex === 4 && row.includes('span2') && (
                <Pressable
                  style={({ pressed }) => [
                    styles.calculatorButton,
                    pressed && styles.buttonPressed,
                    styles.equalsButton,
                  ]}
                  onPress={() => handlePress('=')}
                >
                  <Text style={[styles.buttonText, styles.equalsButtonText]}>=</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
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
  display: {
    fontSize: 28,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: '80%',
    textAlign: 'right',
    marginBottom: 20,
  },
  calculator: {
    width: '80%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calculatorButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 20,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  zeroButton: {
    flex: 2,
  },
  buttonPressed: {
    backgroundColor: '#d0d0d0',
  },
  clearButton: {
    backgroundColor: '#FF5252',
  },
  clearButtonText: {
    color: '#fff',
  },
  operatorButton: {
    backgroundColor: '#FFA500',
  },
  operatorButtonText: {
    color: '#fff',
  },
  equalsButton: {
    backgroundColor: '#4CAF50',
  },
  equalsButtonText: {
    color: '#fff',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
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