import { COMMON_PASSWORDS } from './commonPasswords';

// Mirrors family-command-center-api/src/utils/passwordPolicy.ts exactly —
// two repos, so it can't be a literal shared module, but the rule must stay
// identical. This client-side copy exists only for immediate sign-up-form
// feedback (no round trip needed for the common case); the server-side copy
// is the one that actually gates account creation/password changes.
export const PASSWORD_MIN_LENGTH = 10;

export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one letter and one number' };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, reason: 'This password is too common. Please choose a different one.' };
  }
  return { valid: true };
}
