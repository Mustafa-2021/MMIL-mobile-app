import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { RootStackParamList } from '../types';

/** Shown to a logged-in employee who has not been given access to any section yet. */
export default function NoAccessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuthContext();
  if (!profile) return null;

  return (
    <View style={styles.container}>
      <Icon name="account-clock-outline" size={64} color={colors.primary} />
      <Text variant="headlineSmall" style={styles.title}>
        Welcome, {profile.name}
      </Text>
      <Text style={styles.body}>
        You are registered, but no section of the app has been assigned to you yet. Please contact
        the admin to get access.
      </Text>
      {profile.superAdmin && (
        <Button
          mode="contained"
          icon="shield-account-outline"
          style={styles.button}
          contentStyle={styles.buttonContent}
          onPress={() => navigation.navigate('SuperAdmin')}>
          Super Admin
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 28,
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  buttonContent: {
    height: 52,
  },
});
