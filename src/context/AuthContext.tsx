import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, linkWithPopup, reauthenticateWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  createCalendarAuthProvider,
  getCachedGoogleAccessToken,
  setCachedGoogleAccessToken,
  clearCachedGoogleAccessToken
} from '../lib/firebase';
import { getFriendlyErrorMessage, handleFirestoreError, OperationType, sanitizeFirestorePayload } from '../lib/firestoreErrors';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  simulatedUser: UserProfile | null;
  activeRole: UserRole;
  effectiveUser: UserProfile;
  loading: boolean;
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  connectGoogleCalendar: () => Promise<string>;
  clearGoogleAccessToken: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPasswordEmail: (emailOrUsername: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  switchSimulatedUser: (user: UserProfile) => void;
  resetToRealUser: () => void;
  availableUsers: UserProfile[];
}

const GUEST_PROFILE: UserProfile = {
  id: '',
  email: '',
  name: 'Guest',
  role: 'recruiter',
  disabled: false
};

const DEFAULT_CEO_PROFILE: UserProfile = {
  id: 'ceo-admin-user',
  email: 'ahmedsamii269@gmail.com',
  name: 'Ahmed Samii (Founder & CEO)',
  role: 'ceo',
  phone: '+201000000000',
  instaPay: 'ahmedsamii@instapay',
  mobileWallet: '01000000000',
  facebook: 'https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr',
  linkedin: 'https://www.linkedin.com/company/redz-recruitment1/',
  disabled: false
};

const stripUndefined = <T,>(obj: T): T => sanitizeFirestorePayload(obj);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => getCachedGoogleAccessToken());

  // Listen to Auth State and match with CEO-created user profiles by email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        const loginMeta = {
          lastLoginAt: new Date().toISOString(),
          lastLoginDevice: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'Web'
        };
        try {
          const userEmail = (firebaseUser.email || '').toLowerCase();
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let snap;
          try {
            snap = await getDoc(userDocRef);
          } catch (firstGetErr: any) {
            const msg = String(firstGetErr?.message || '').toLowerCase();
            if (firstGetErr?.code === 'unavailable' || msg.includes('the client is offline')) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              snap = await getDoc(userDocRef);
            } else {
              throw firstGetErr;
            }
          }

          if (snap.exists()) {
            const existing = { ...snap.data(), id: snap.id } as UserProfile;
            setUserProfile({ ...existing, ...loginMeta });
            setDoc(userDocRef, loginMeta, { merge: true }).catch(() => {});
          } else {
            // Check if CEO pre-created a profile for this email in Firestore users collection
            let matchedProfile: UserProfile | null = null;
            try {
              const usersSnap = await getDocs(collection(db, 'users'));
              usersSnap.forEach((d) => {
                const uData = d.data() as UserProfile;
                if (uData.email && uData.email.toLowerCase() === userEmail) {
                  matchedProfile = { ...uData, id: firebaseUser.uid, ...loginMeta };
                }
              });
            } catch {
              // Ignore if user cannot list collection before doc exists
            }

            if (matchedProfile) {
              await setDoc(userDocRef, stripUndefined(matchedProfile), { merge: true });
              setUserProfile(matchedProfile);
            } else {
              // New user registration
              const isCeoEmail = userEmail === 'ahmedsamii269@gmail.com';
              const newProfile: UserProfile = stripUndefined({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || (isCeoEmail ? 'Ahmed Samii (Founder & CEO)' : 'Redz Team Member'),
                role: isCeoEmail ? 'ceo' : 'recruiter',
                photoUrl: firebaseUser.photoURL || undefined,
                disabled: false,
                createdAt: new Date().toISOString(),
                ...loginMeta
              });
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            }
          }
        } catch (err: any) {
          const msg = String(err?.message || '').toLowerCase();
          if (err?.code === 'unavailable' || msg.includes('the client is offline')) {
            console.warn('Firestore offline during initial profile fetch; using temporary fallback until synced.');
          } else {
            console.error('Error fetching/matching user profile:', err);
          }
          if (firebaseUser.email?.toLowerCase() === 'ahmedsamii269@gmail.com') {
            setUserProfile({ ...DEFAULT_CEO_PROFILE, id: firebaseUser.uid, ...loginMeta });
          } else {
            setUserProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Redz Team Member',
              role: 'recruiter',
              disabled: false,
              ...loginMeta
            });
          }
        }
      } else {
        clearCachedGoogleAccessToken();
        setGoogleAccessToken(null);
        setUserProfile(null);
        setSimulatedUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to all users in Firestore only while authenticated
  useEffect(() => {
    if (!currentUser) {
      setAvailableUsers([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as UserProfile));
        setAvailableUsers(list);
      },
      (err) => {
        console.warn('Users listener error in AuthContext:', err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign-in error:', error);
      throw new Error(getFriendlyErrorMessage(error, 'Google Sign-In failed. Please try again.'));
    }
  };

  const connectGoogleCalendar = async (): Promise<string> => {
    const calendarProvider = createCalendarAuthProvider();
    try {
      let result;
      if (!auth.currentUser) {
        result = await signInWithPopup(auth, calendarProvider);
      } else {
        const hasGoogleProvider = auth.currentUser.providerData.some((p) => p.providerId === 'google.com');
        if (hasGoogleProvider) {
          try {
            result = await reauthenticateWithPopup(auth.currentUser, calendarProvider);
          } catch (reauthErr: any) {
            if (reauthErr?.code === 'auth/user-mismatch') {
              result = await signInWithPopup(auth, calendarProvider);
            } else {
              throw reauthErr;
            }
          }
        } else {
          try {
            result = await linkWithPopup(auth.currentUser, calendarProvider);
          } catch (linkErr: any) {
            if (
              linkErr?.code === 'auth/credential-already-in-use' ||
              linkErr?.code === 'auth/provider-already-linked' ||
              linkErr?.code === 'auth/email-already-in-use'
            ) {
              result = await signInWithPopup(auth, calendarProvider);
            } else {
              throw linkErr;
            }
          }
        }
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Google Calendar permission was not granted. Please allow Calendar access in the Google prompt.');
      }

      setCachedGoogleAccessToken(credential.accessToken);
      setGoogleAccessToken(credential.accessToken);
      return credential.accessToken;
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      throw new Error(getFriendlyErrorMessage(error, 'Could not connect Google Calendar. Please try again.'));
    }
  };

  const clearGoogleAccessToken = () => {
    clearCachedGoogleAccessToken();
    setGoogleAccessToken(null);
  };

  const resolveLoginIdentifier = async (
    emailOrUsername: string
  ): Promise<{ email: string; resolvedFromDirectory: boolean }> => {
    const raw = emailOrUsername.trim();
    const rawLower = raw.toLowerCase();

    if (rawLower === 'ahmedsamii269' || rawLower === 'ahmedsamii269@gmail.com') {
      return { email: 'ahmedsamii269@gmail.com', resolvedFromDirectory: true };
    }

    if (raw.includes('@')) {
      return { email: raw, resolvedFromDirectory: false };
    }

    // Look up username -> email from privacy-safe single-doc directory
    try {
      const dirSnap = await getDoc(doc(db, 'usernameDirectory', rawLower));
      if (dirSnap.exists()) {
        const mappedEmail = (dirSnap.data() as { email?: string })?.email;
        if (mappedEmail && mappedEmail.includes('@')) {
          return { email: mappedEmail.trim(), resolvedFromDirectory: true };
        }
      }
    } catch {
      // Ignore network/offline lookup errors and fall back cleanly
    }

    return { email: `${rawLower}@redz-agency.com`, resolvedFromDirectory: false };
  };

  const signInWithEmail = async (emailOrUsername: string, password: string) => {
    try {
      const rawInput = emailOrUsername.trim();
      const { email: targetEmail, resolvedFromDirectory } = await resolveLoginIdentifier(rawInput);

      try {
        await signInWithEmailAndPassword(auth, targetEmail, password);
      } catch (firstErr: any) {
        // If account doesn't exist yet in Firebase Auth for pre-authorized user (e.g. CEO), auto-register it
        if (
          firstErr.code === 'auth/invalid-credential' ||
          firstErr.code === 'auth/user-not-found' ||
          firstErr.message?.includes('invalid-credential')
        ) {
          const isCeo = targetEmail.toLowerCase() === 'ahmedsamii269@gmail.com';
          let isPreAuthorized = isCeo;

          if (!isPreAuthorized) {
            try {
              const usersSnap = await getDocs(collection(db, 'users'));
              usersSnap.forEach((d) => {
                const uData = d.data() as UserProfile;
                if (uData.email && uData.email.toLowerCase() === targetEmail.toLowerCase()) {
                  isPreAuthorized = true;
                }
              });
            } catch {
              // Signed-out Firestore reads are restricted
            }
          }

          if (isPreAuthorized) {
            try {
              await createUserWithEmailAndPassword(auth, targetEmail, password);
              return;
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw new Error('Incorrect password for this account. If you forgot your password, please use Google Sign-In or contact system admin.');
              }
              throw createErr;
            }
          }
        }

        // Fallback: if username wasn't in usernameDirectory, also try @gmail.com directly
        if (!rawInput.includes('@') && !resolvedFromDirectory && targetEmail !== 'ahmedsamii269@gmail.com') {
          try {
            await signInWithEmailAndPassword(auth, `${rawInput.toLowerCase()}@gmail.com`, password);
            return;
          } catch {
            // Keep original error
          }
        }

        throw firstErr;
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      if (error.code === 'auth/invalid-credential' || error.message?.includes('invalid-credential')) {
        throw new Error('Invalid credentials. Please double check your username/email and password, or contact Redz Management.');
      }
      throw new Error(getFriendlyErrorMessage(error, 'Failed to sign in. Please check your credentials.'));
    }
  };

  const signUpWithEmail = async (emailOrUsername: string, password: string) => {
    try {
      const { email, resolvedFromDirectory } = await resolveLoginIdentifier(emailOrUsername);
      const emailLower = email.toLowerCase();

      let isPreAuthorized = emailLower === 'ahmedsamii269@gmail.com' || resolvedFromDirectory;
      if (!isPreAuthorized) {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach((d) => {
            const uData = d.data() as UserProfile;
            if (
              (uData.email && uData.email.toLowerCase() === emailLower) ||
              (uData.username && `${uData.username.toLowerCase()}@redz-agency.com` === emailLower)
            ) {
              isPreAuthorized = true;
            }
          });
        } catch {
          // Signed-out Firestore reads are restricted
        }
      }

      if (!isPreAuthorized) {
        throw new Error('This account is not pre-authorized by Redz Management. Please contact your supervisor.');
      }

      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign-up error:', error);
      throw new Error(getFriendlyErrorMessage(error, 'Account activation failed. Please verify your email and password.'));
    }
  };

  const resetPasswordEmail = async (emailOrUsername: string) => {
    const { email } = await resolveLoginIdentifier(emailOrUsername);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, 'Could not send password reset email.'));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      clearCachedGoogleAccessToken();
      setGoogleAccessToken(null);
      setSimulatedUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    const targetId = effectiveUser.id;
    if (!targetId) {
      throw new Error('No authenticated user profile available.');
    }
    const sanitizedData = stripUndefined(data);
    try {
      const userRef = doc(db, 'users', targetId);
      await setDoc(userRef, sanitizedData, { merge: true });
      if (userProfile && userProfile.id === targetId) {
        setUserProfile(prev => prev ? { ...prev, ...sanitizedData } : null);
      }
      if (simulatedUser && simulatedUser.id === targetId) {
        setSimulatedUser(prev => prev ? { ...prev, ...sanitizedData } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetId}`);
    }
  };

  const switchSimulatedUser = (user: UserProfile) => {
    const isRealCeo =
      userProfile?.role === 'ceo' ||
      currentUser?.email?.toLowerCase() === 'ahmedsamii269@gmail.com';
    if (!isRealCeo) return;
    setSimulatedUser(user);
  };

  const resetToRealUser = () => {
    setSimulatedUser(null);
  };

  const effectiveUser = simulatedUser || userProfile || GUEST_PROFILE;
  const activeRole = effectiveUser.role;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        simulatedUser,
        activeRole,
        effectiveUser,
        loading,
        googleAccessToken,
        signInWithGoogle,
        connectGoogleCalendar,
        clearGoogleAccessToken,
        signInWithEmail,
        signUpWithEmail,
        resetPasswordEmail,
        logout,
        updateProfileData,
        switchSimulatedUser,
        resetToRealUser,
        availableUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

