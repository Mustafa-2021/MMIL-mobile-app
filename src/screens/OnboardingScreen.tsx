import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { getAuth } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { createTeam, createUserProfile, joinTeam, signOutUser } from '../services/auth';
import { setPendingSignup, takePendingSignup } from '../services/pendingSignup';
import { RootStackParamList } from '../types';

type Mode = 'choose' | 'create' | 'join';
type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * phase "preAuth":  the "New user" form before phone verification. Details are held
 *                   until OTP succeeds, then this screen is shown again in "postAuth".
 * phase "postAuth": signed in but no team yet. Finishes a pending signup automatically,
 *                   or lets someone who logged in as "Existing user" without an account set up.
 */
type Props = { phase: 'preAuth' } | { phase: 'postAuth'; onDone: () => void };

export default function OnboardingScreen(props: Props) {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSetup, setAutoSetup] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  // Set when an "Existing user" logs in with a number that has no account.
  const [noAccount, setNoAccount] = useState(false);
  const autoRan = useRef(false);

  const user = getAuth().currentUser;
  const isPreAuth = props.phase === 'preAuth';

  const runCreate = async (fullName: string, team: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await createUserProfile(user.uid, fullName, user.phoneNumber || '');
      const { team: created } = await createTeam(user.uid, team);
      setCreatedCode(created.inviteCode);
      Toast.show({ type: 'success', text1: 'Workspace created!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not create team', text2: e?.message });
    } finally {
      setLoading(false);
      setAutoSetup(false);
    }
  };

  const runJoin = async (fullName: string, code: string) => {
    if (!user || props.phase !== 'postAuth') return;
    setLoading(true);
    try {
      await createUserProfile(user.uid, fullName, user.phoneNumber || '');
      await joinTeam(user.uid, code);
      Toast.show({ type: 'success', text1: 'Joined team successfully!' });
      props.onDone();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not join team', text2: e?.message });
    } finally {
      setLoading(false);
      setAutoSetup(false);
    }
  };

  // After OTP: finish the signup the user started before verifying their number.
  useEffect(() => {
    if (isPreAuth || autoRan.current) return;
    autoRan.current = true;
    const pending = takePendingSignup();
    if (!pending) {
      setNoAccount(true);
      return;
    }
    setName(pending.name);
    setAutoSetup(true);
    if (pending.mode === 'create') {
      setTeamName(pending.teamName);
      setMode('create');
      runCreate(pending.name, pending.teamName);
    } else {
      setInviteCode(pending.inviteCode);
      setMode('join');
      runJoin(pending.name, pending.inviteCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueTo = (next: Mode) => {
    if (name.trim().length < 2) {
      setNameError(true);
      return;
    }
    setMode(next);
  };

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a team/workspace name' });
      return;
    }
    if (isPreAuth) {
      setPendingSignup({ name: name.trim(), mode: 'create', teamName: teamName.trim() });
      navigation.navigate('Login', { mode: 'new' });
    } else {
      runCreate(name.trim(), teamName.trim());
    }
  };

  const handleJoinTeam = () => {
    if (inviteCode.trim().length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit invite code' });
      return;
    }
    if (isPreAuth) {
      setPendingSignup({ name: name.trim(), mode: 'join', inviteCode: inviteCode.trim() });
      navigation.navigate('Login', { mode: 'new' });
    } else {
      runJoin(name.trim(), inviteCode.trim());
    }
  };

  const switchNumber = () => signOutUser().catch(() => {});

  const submitLabel = (text: string) => (isPreAuth ? 'Continue' : text);

  if (autoSetup) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Setting up your account…</Text>
      </View>
    );
  }

  if (createdCode && props.phase === 'postAuth') {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.heading}>
          Workspace created!
        </Text>
        <Text style={styles.subtitle}>
          Share this invite code with your team members so they can join:
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{createdCode}</Text>
        </View>
        <Button
          mode="contained"
          style={styles.button}
          contentStyle={styles.buttonContent}
          onPress={props.onDone}>
          Continue to My Dashboard
        </Button>
      </View>
    );
  }

  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.heading}>
          {noAccount ? 'No account found' : 'Welcome!'}
        </Text>
        <Text style={styles.subtitle}>
          {noAccount
            ? `We couldn't find an account for ${user?.phoneNumber ?? 'this number'}. Set one up below, or use a different number.`
            : "Let's get you set up."}
        </Text>
        <TextInput
          mode="outlined"
          label="Your full name *"
          value={name}
          onChangeText={text => {
            setName(text);
            if (nameError) setNameError(false);
          }}
          error={nameError}
          autoCapitalize="words"
          style={styles.input}
        />
        {nameError && (
          <Text style={styles.errorText}>Please enter your full name to continue</Text>
        )}
        <Button
          mode="contained"
          style={styles.button}
          contentStyle={styles.buttonContent}
          onPress={() => continueTo('create')}>
          Create New Team (Admin)
        </Button>
        <Button
          mode="outlined"
          style={styles.button}
          contentStyle={styles.buttonContent}
          onPress={() => continueTo('join')}>
          Join Existing Team
        </Button>
        {isPreAuth ? (
          <Button mode="text" onPress={() => navigation.goBack()}>
            Back
          </Button>
        ) : (
          <Button mode="text" onPress={switchNumber}>
            Use a different number
          </Button>
        )}
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.heading}>
          Create your team
        </Text>
        <TextInput
          mode="outlined"
          label="Team / workspace name"
          value={teamName}
          onChangeText={setTeamName}
          style={styles.input}
        />
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          onPress={handleCreateTeam}>
          {submitLabel('Create Team')}
        </Button>
        <Button mode="text" disabled={loading} onPress={() => setMode('choose')}>
          Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.heading}>
        Join your team
      </Text>
      <TextInput
        mode="outlined"
        label="6-digit invite code"
        keyboardType="number-pad"
        maxLength={6}
        value={inviteCode}
        onChangeText={setInviteCode}
        style={styles.input}
      />
      <Button
        mode="contained"
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        onPress={handleJoinTeam}>
        {submitLabel('Join Team')}
      </Button>
      <Button mode="text" disabled={loading} onPress={() => setMode('choose')}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centered: {
    alignItems: 'center',
  },
  heading: {
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 24,
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: colors.high,
    marginTop: -10,
    marginBottom: 14,
  },
  button: {
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonContent: {
    height: 52,
  },
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 28,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 6,
  },
});
