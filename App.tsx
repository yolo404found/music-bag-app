import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/core/providers/AppProvider';
import AppNavigator from './src/core/navigation/AppNavigator';

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AppProvider>
  );
}
