import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function App() {
  const handlePress = () => {
    alert('Hello, bro! App is working 🎉');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Photo Hider 📷</Text>
      <Button title="Tap Me" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
});
