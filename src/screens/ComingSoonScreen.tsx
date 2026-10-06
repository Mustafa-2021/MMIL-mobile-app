import React, { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/theme';
import { RootStackParamList } from '../types';

const COPY = {
  HR: {
    icon: 'account-tie-outline',
    text: 'The HR section is being prepared and will be available here soon.',
  },
  Visitor: {
    icon: 'badge-account-horizontal-outline',
    text: 'Digital gate passes and visitor approvals will be available here soon.',
  },
};

/** Placeholder for sections that are not built yet. */
export default function ComingSoonScreen() {
  const navigation = useNavigation();
  const { section } = useRoute<RouteProp<RootStackParamList, 'ComingSoon'>>().params;

  useLayoutEffect(() => {
    navigation.setOptions({ title: section });
  }, [navigation, section]);

  return (
    <View style={styles.container}>
      <Icon name={COPY[section].icon} size={64} color={colors.primary} />
      <Text style={styles.title}>Coming soon</Text>
      <Text style={styles.body}>{COPY[section].text}</Text>
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
    fontSize: 21,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  body: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
