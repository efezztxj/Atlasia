import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  authBackend,
  authConfigured,
  authErrorMessage,
  getAtlasAuth,
  isSupportedAccount,
  registerEmail,
  sendAtlasVerificationEmail,
  signInEmail,
  toFirebaseAccount,
} from "../lib/auth";
import { AccountError, type AtlasAccount, type AuthBackend, type SignupDetails } from "../lib/accountTypes";
import { registerDeviceAccount, restoreDeviceSession, signInDeviceAccount, signOutDeviceAccount, updateDeviceProfile } from "../lib/deviceAccounts";

export interface SignupResult {
  recoveryCode?: string;
  finish?: () => Promise<void>;
}

interface AuthState {
  user: AtlasAccount | null;
  backend: AuthBackend;
  checking: boolean;
  error: string | null;
  logout: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (details: SignupDetails) => Promise<SignupResult>;
  refreshSession: () => Promise<AtlasAccount | null>;
  resendVerification: () => Promise<void>;
}

const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AtlasAccount | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    let mounted = true;
    if (!authConfigured) {
      const request = ++generation.current;
      void restoreDeviceSession().then((restored) => {
        if (mounted && request === generation.current) setUser(restored);
      }).catch((failure) => {
        if (mounted) setError(authErrorMessage(failure));
      }).finally(() => { if (mounted) setChecking(false); });
      return () => { mounted = false; };
    }

    let unsubscribe = () => {};
    void (async () => {
      const [{ getRedirectResult, onAuthStateChanged, signOut, updateProfile }, auth] = await Promise.all([
        import("firebase/auth"),
        getAtlasAuth(),
      ]);
      if (!mounted) return;
      unsubscribe = onAuthStateChanged(auth, async (next) => {
        if (!mounted) return;
        const request = ++generation.current;
        if (next && !isSupportedAccount(next)) {
          setUser(null);
          setError("Bu hesap için desteklenen bir giriş yöntemi kullanmalısın.");
          void signOut(auth).catch((signOutError: unknown) => {
            // Desteklenmeyen hesap zaten hata mesajıyla durduruldu; otomatik
            // çıkış da başarısızsa tanılama için sessiz kalma.
            console.warn("Desteklenmeyen hesap otomatik olarak kapatılamadı.", signOutError);
          });
        } else {
          if (next) {
            let pendingName: string | null = null;
            try { pendingName = sessionStorage.getItem("atlasia.pendingName"); } catch { /* Profile preference only. */ }
            if (pendingName && pendingName.trim().length >= 2) {
              try { await updateProfile(next, { displayName: pendingName.trim().slice(0, 40) }); sessionStorage.removeItem("atlasia.pendingName"); }
              catch { /* A verified member can finish/edit the profile after signing in. */ }
            }
          }
          if (!mounted || request !== generation.current) return;
          setUser(next ? toFirebaseAccount(next) : null);
          setError(null);
        }
        setChecking(false);
      }, (failure) => {
        if (!mounted) return;
        setChecking(false);
        setError(authErrorMessage(failure));
      });
      void getRedirectResult(auth).catch((failure) => {
        if (mounted) setError(authErrorMessage(failure));
      });
    })().catch((failure) => {
      if (!mounted) return;
      setChecking(false);
      setError(authErrorMessage(failure));
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    ++generation.current;
    if (authBackend === "device") {
      setUser(await signInDeviceAccount(email, password));
    } else {
      const credential = await signInEmail(email, password);
      setUser(toFirebaseAccount(credential.user));
    }
    setChecking(false);
  };

  const signup = async (details: SignupDetails): Promise<SignupResult> => {
    setError(null);
    if (authBackend === "device") {
      const created = await registerDeviceAccount(details);
      return {
        recoveryCode: created.recoveryCode,
        finish: async () => {
          ++generation.current;
          setUser(await created.finish());
          setChecking(false);
        },
      };
    }
    const credential = await registerEmail(details);
    setUser(toFirebaseAccount(credential.user));
    return {};
  };

  const logout = async () => {
    ++generation.current;
    if (authBackend === "device") {
      try { await signOutDeviceAccount(); }
      finally { setUser(null); setError(null); }
      return;
    }
    const [{ signOut }, auth] = await Promise.all([import("firebase/auth"), getAtlasAuth()]);
    await signOut(auth);
    setUser(null);
    setError(null);
  };

  const setName = async (name: string) => {
    if (!user) return;
    const displayName = name.trim().slice(0, 40);
    if (displayName.length < 2) throw new AccountError("auth/invalid-profile-name");
    if (authBackend === "device") {
      setUser(await updateDeviceProfile(displayName));
      return;
    }
    const [{ updateProfile }, auth] = await Promise.all([import("firebase/auth"), getAtlasAuth()]);
    const current = auth.currentUser;
    if (!current) throw new AccountError("auth/session-expired");
    await updateProfile(current, { displayName });
    setUser(toFirebaseAccount(current));
  };

  const refreshSession = async () => {
    if (authBackend === "device") {
      const restored = await restoreDeviceSession();
      setUser(restored);
      return restored;
    }
    const [{ reload }, auth] = await Promise.all([import("firebase/auth"), getAtlasAuth()]);
    const current = auth.currentUser;
    if (!current) { setUser(null); return null; }
    await reload(current);
    await current.getIdToken(true);
    const updated = toFirebaseAccount(current);
    setUser(updated);
    return updated;
  };

  const resendVerification = async () => {
    const auth = await getAtlasAuth();
    const current = auth.currentUser;
    if (!current) throw new AccountError("auth/session-expired");
    await sendAtlasVerificationEmail(current);
  };

  const deviceSessionUid = user?.backend === "device" ? user.uid : null;

  useEffect(() => {
    if (!deviceSessionUid) return;
    let active = true;
    const check = () => {
      void restoreDeviceSession().then((current) => { if (active && !current) setUser(null); }).catch(() => { if (active) setUser(null); });
    };
    const timer = setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", check); };
  }, [deviceSessionUid]);

  return <Context.Provider value={{ user, backend: authBackend, checking, error, logout, setName, login, signup, refreshSession, resendVerification }}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider is required.");
  return value;
}