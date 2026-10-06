import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { theme } from './src/theme/theme';
import { AuthProvider } from './src/hooks/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;
