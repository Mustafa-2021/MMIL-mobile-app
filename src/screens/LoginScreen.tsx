import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { ConfirmationResult } from '@react-native-firebase/auth';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { confirmOtp, sendOtp } from '../services/auth';
import { RootStackParamList } from '../types';
import { isValidPhone, toE164 } from '../utils/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type LoginRoute = RouteProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { mode } = useRoute<LoginRoute>().params;
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const fullPhone = toE164(phone);

  const handleSendOtp = async () => {
    if (!isValidPhone(fullPhone)) {
      Toast.show({ type: 'error', text1: 'Enter a valid phone number' });
      return;
    }
    setLoading(true);
    try {
      confirmationRef.current = await sendOtp(fullPhone);
      setStage('otp');
      Toast.show({ type: 'success', text1: 'OTP sent successfully' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not send OTP', text2: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit OTP' });
      return;
    }
    if (!confirmationRef.current) return;
    setLoading(true);
    try {
      await confirmOtp(confirmationRef.current, otp);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Incorrect OTP', text2: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Image
          source={require('../assets/mmil-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="MMIL logo"
        />
        <Text variant="headlineMedium" style={styles.title}>
          MMIL Purchase
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {mode === 'new'
            ? 'Last step: verify your mobile number to finish setting up your account'
            : 'Log in with your registered mobile number'}
        </Text>

        {stage === 'phone' ? (
          <>
            <TextInput
              mode="outlined"
              label="Phone number"
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleSendOtp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}>
              Send OTP
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()} disabled={loading}>
              Back
            </Button>
          </>
        ) : (
          <>
            <TextInput
              mode="outlined"
              label="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}>
              Verify & Continue
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setStage('phone');
                setOtp('');
              }}
              disabled={loading}>
              Change phone number
            </Button>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 10,
    marginBottom: 8,
  },
  buttonContent: {
    height: 52,
  },
});
