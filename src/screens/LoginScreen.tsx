import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { ConfirmationResult, getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { colors } from '../theme/theme';
import {
  completeEmployeeLogin,
  confirmOtp,
  isEmployeeUid,
  sendOtp,
  verifyEmployee,
} from '../services/auth';
import { dobInputToIso, isValidPhone, maskDobInput, toE164 } from '../utils/helpers';

type Stage = 'employee' | 'phone' | 'otp';

/**
 * Employee login: (1) employee ID + date of birth, checked against the HR list;
 * (2) mobile number + OTP; (3) the verified number is linked to the employee account.
 */
export default function LoginScreen() {
  const [stage, setStage] = useState<Stage>('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [dobText, setDobText] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const linkingRef = useRef(false);
  // Latest values for the auth listener, which is registered once.
  const credsRef = useRef({ employeeId: '', dob: '' });

  const dob = dobInputToIso(dobText);

  const resetToStart = (message?: string) => {
    setStage('employee');
    setOtp('');
    confirmationRef.current = null;
    if (message) setError(message);
  };

  const linkAccount = async () => {
    if (linkingRef.current) return;
    linkingRef.current = true;
    setLoading(true);
    try {
      // On success the auth listener in useAuth takes over and opens the app.
      await completeEmployeeLogin(credsRef.current.employeeId, credsRef.current.dob);
    } catch (e: any) {
      resetToStart(e?.message);
      setLoading(false);
    } finally {
      linkingRef.current = false;
    }
  };

  // Android can verify the SMS by itself and sign in without the OTP being typed.
  useEffect(() => {
    return onAuthStateChanged(getAuth(), user => {
      if (user && !isEmployeeUid(user.uid) && confirmationRef.current) linkAccount();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerifyEmployee = async () => {
    setError('');
    const id = employeeId.trim();
    if (!id) return setError('Enter your employee ID.');
    if (!dob) return setError('Enter your date of birth as DD/MM/YYYY.');
    setLoading(true);
    try {
      const name = await verifyEmployee(id, dob);
      credsRef.current = { employeeId: id, dob };
      setEmployeeName(name);
      setStage('phone');
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    const fullPhone = toE164(phone);
    if (!isValidPhone(fullPhone)) return setError('Enter a valid 10-digit mobile number.');
    setLoading(true);
    try {
      confirmationRef.current = await sendOtp(fullPhone);
      setStage('otp');
      Toast.show({ type: 'success', text1: 'OTP sent' });
    } catch (e: any) {
      setError(`Could not send OTP. ${e?.message ?? ''}`.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (otp.length !== 6) return setError('Enter the 6-digit OTP.');
    if (!confirmationRef.current) return;
    setLoading(true);
    try {
      await confirmOtp(confirmationRef.current, otp);
      await linkAccount();
    } catch {
      setError('Incorrect OTP. Please check and try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../assets/mmil-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="MMIL logo"
        />
        <Text variant="headlineMedium" style={styles.title}>
          MMIL
        </Text>

        {stage === 'employee' && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Log in with your employee ID and date of birth
            </Text>
            <TextInput
              mode="outlined"
              label="Employee ID"
              autoCapitalize="characters"
              autoCorrect={false}
              value={employeeId}
              onChangeText={setEmployeeId}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Date of birth"
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              maxLength={10}
              value={dobText}
              onChangeText={t => setDobText(maskDobInput(t))}
              style={styles.input}
            />
            <ErrorText message={error} />
            <Button
              mode="contained"
              onPress={handleVerifyEmployee}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}>
              Continue
            </Button>
          </>
        )}

        {stage === 'phone' && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Hi {employeeName}! Enter your mobile number to receive an OTP.
            </Text>
            <TextInput
              mode="outlined"
              label="Mobile number"
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
            />
            <ErrorText message={error} />
            <Button
              mode="contained"
              onPress={handleSendOtp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}>
              Send OTP
            </Button>
            <Button mode="text" onPress={() => resetToStart()} disabled={loading}>
              Back
            </Button>
          </>
        )}

        {stage === 'otp' && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter the OTP sent to {toE164(phone)}
            </Text>
            <TextInput
              mode="outlined"
              label="6-digit OTP"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              style={styles.input}
            />
            <ErrorText message={error} />
            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}>
              Verify & Log in
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setStage('phone');
                setOtp('');
                setError('');
                confirmationRef.current = null;
              }}
              disabled={loading}>
              Change mobile number
            </Button>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <HelperText type="error" visible style={styles.error}>
      {message}
    </HelperText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
    marginBottom: 28,
  },
  input: {
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    marginTop: -8,
    marginBottom: 8,
  },
  button: {
    borderRadius: 10,
    marginBottom: 8,
  },
  buttonContent: {
    height: 52,
  },
});
