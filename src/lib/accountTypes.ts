export type AuthBackend = "firebase" | "device";

export interface AtlasAccount {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  requiresEmailVerification: boolean;
  backend: AuthBackend;
}

export interface SignupDetails {
  email: string;
  password: string;
  displayName: string;
  country: string;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function passwordRules(password: string) {
  return {
    length: password.length >= 8 && password.length <= 128,
    letter: /\p{L}/u.test(password),
    number: /\d/.test(password),
  };
}

export function validPassword(password: string) {
  return Object.values(passwordRules(password)).every(Boolean);
}

export class AccountError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "AccountError";
    this.code = code;
  }
}