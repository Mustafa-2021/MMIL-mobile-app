// Details a new user enters before verifying their phone number. Kept in memory
// until OTP succeeds, then OnboardingScreen uses them to finish setup automatically.
export type PendingSignup =
  | { name: string; mode: 'create'; teamName: string }
  | { name: string; mode: 'join'; inviteCode: string };

let pending: PendingSignup | null = null;

export function setPendingSignup(value: PendingSignup) {
  pending = value;
}

/** Returns the pending signup (if any) and clears it so it only runs once. */
export function takePendingSignup(): PendingSignup | null {
  const value = pending;
  pending = null;
  return value;
}
