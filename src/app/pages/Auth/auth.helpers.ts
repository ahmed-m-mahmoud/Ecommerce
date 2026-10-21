import { AbstractControl } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 16;

/** Translation keys for every candidate validation error, in priority order. */
const VALIDATION_KEY_MAP: Record<string, string> = {
  required: 'AUTH.VALIDATION.REQUIRED',
  email: 'AUTH.VALIDATION.EMAIL',
  minlength: 'AUTH.VALIDATION.MIN_LENGTH',
  maxlength: 'AUTH.VALIDATION.MAX_LENGTH',
  pattern: 'AUTH.VALIDATION.INVALID',
  mismatch: 'AUTH.VALIDATION.PASSWORD_MISMATCH',
};

/** Returns the translation key of the first active error on a control, or null. */
export function firstErrorKey(control: AbstractControl | null): string | null {
  if (!control || !control.errors) return null;
  for (const key of Object.keys(VALIDATION_KEY_MAP)) {
    if (control.errors?.[key]) return VALIDATION_KEY_MAP[key];
  }
  return 'AUTH.VALIDATION.INVALID';
}

export interface PasswordStrength {
  /** 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong */
  level: 0 | 1 | 2 | 3 | 4;
  /** Translation key for the strength label */
  labelKey: string;
}

/** Lightweight heuristic password strength scored 0-4. */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { level: 0, labelKey: 'AUTH.STRENGTH.LABEL' };

  const checks = [
    value.length >= PASSWORD_MIN_LENGTH,
    value.length >= 10,
    /[A-Z]/.test(value) && /[a-z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;

  if (score <= 1) return { level: 1, labelKey: 'AUTH.STRENGTH.WEAK' };
  if (score === 2) return { level: 2, labelKey: 'AUTH.STRENGTH.FAIR' };
  if (score === 3) return { level: 3, labelKey: 'AUTH.STRENGTH.GOOD' };
  return { level: 4, labelKey: 'AUTH.STRENGTH.STRONG' };
}
