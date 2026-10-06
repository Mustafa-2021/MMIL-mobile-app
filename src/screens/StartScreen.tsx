import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Start'>;

export default function StartScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
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
        Purchase Task Management
      </Text>

      <ChoiceCard
        icon="account-check-outline"
        title="Existing user"
        description="Log in with your mobile number"
        onPress={() => navigation.navigate('Login', { mode: 'existing' })}
      />
      <ChoiceCard
        icon="account-plus-outline"
        title="New user"
        description="Create a new team or join one with an invite code"
        onPress={() => navigation.navigate('Signup')}
      />
    </View>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={26} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardDescription: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
