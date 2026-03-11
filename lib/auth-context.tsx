import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Users, Earnings } from "@/lib/firestore";
import { removePushToken } from "@/lib/notifications";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string, sponsorCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const fallbackUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
          phone: "",
        };

        try {
          const profile = await Users.getById(firebaseUser.uid);
          if (profile) {
            if (!profile.uniqueId) {
              try {
                const newId = await Users.generateUniqueId();
                await Users.update(firebaseUser.uid, { uniqueId: newId });
              } catch (e) {
                console.warn("Failed to assign DZ ID:", e);
              }
            } else if (profile.uniqueId.startsWith("DE")) {
              try {
                const updates: Partial<{ uniqueId: string; sponsorId: string }> = { uniqueId: "DZ" + profile.uniqueId.slice(2) };
                if (profile.sponsorId?.startsWith("DE")) updates.sponsorId = "DZ" + profile.sponsorId.slice(2);
                await Users.update(firebaseUser.uid, updates);
              } catch (e) {
                console.warn("Failed to migrate DE to DZ ID:", e);
              }
            } else if (profile.sponsorId?.startsWith("DE")) {
              try {
                await Users.update(firebaseUser.uid, { sponsorId: "DZ" + profile.sponsorId.slice(2) });
              } catch (e) {
                console.warn("Failed to migrate sponsor DE to DZ:", e);
              }
            }
            setUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
            });
          } else {
            setUser(fallbackUser);
          }
        } catch {
          setUser(fallbackUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(identifier: string, password: string) {
    const trimmed = identifier.toLowerCase().trim();
    let emailToUse = trimmed;

    if (!trimmed.includes("@")) {
      try {
        const profileByPhone = await Users.getByPhone(trimmed);
        if (!profileByPhone) {
          throw new Error("No account found with this phone number");
        }
        emailToUse = profileByPhone.email;
      } catch (err: any) {
        if (err.message === "No account found with this phone number") throw err;
        throw new Error("Unable to look up phone number. Please try with your email instead.");
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
      try {
        const profile = await Users.getById(cred.user.uid);
        if (profile) {
          if (!profile.uniqueId) {
            try {
              const newId = await Users.generateUniqueId();
              await Users.update(cred.user.uid, { uniqueId: newId });
            } catch (e) {
              console.warn("Failed to assign DZ ID on login:", e);
            }
          } else if (profile.uniqueId.startsWith("DE")) {
            try {
              const updates: Partial<{ uniqueId: string; sponsorId: string }> = { uniqueId: "DZ" + profile.uniqueId.slice(2) };
              if (profile.sponsorId?.startsWith("DE")) updates.sponsorId = "DZ" + profile.sponsorId.slice(2);
              await Users.update(cred.user.uid, updates);
            } catch (e) {
              console.warn("Failed to migrate DE to DZ ID on login:", e);
            }
          } else if (profile.sponsorId?.startsWith("DE")) {
            try {
              await Users.update(cred.user.uid, { sponsorId: "DZ" + profile.sponsorId.slice(2) });
            } catch (e) {
              console.warn("Failed to migrate sponsor DE to DZ on login:", e);
            }
          }
          setUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone });
        } else {
          setUser({ id: cred.user.uid, name: cred.user.displayName || "", email: cred.user.email || "", phone: "" });
        }
      } catch {
        setUser({ id: cred.user.uid, name: cred.user.displayName || "", email: cred.user.email || "", phone: "" });
      }
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        throw new Error("Invalid email/phone or password");
      }
      throw new Error(err.message || "Login failed");
    }
  }

  async function signup(name: string, email: string, phone: string, password: string, sponsorCode?: string) {
    const emailLower = email.toLowerCase().trim();

    let sponsorUniqueId: string | undefined;
    if (sponsorCode && sponsorCode.trim()) {
      const sponsor = await Users.getByUniqueId(sponsorCode.trim());
      if (!sponsor) {
        throw new Error("Invalid Sponsor ID. Please check and try again.");
      }
      sponsorUniqueId = sponsor.uniqueId;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, emailLower, password);

      let uniqueId = "";
      try {
        uniqueId = await Users.generateUniqueId();
      } catch (e) {
        console.warn("Failed to generate uniqueId:", e);
      }

      try {
        await Users.save(cred.user.uid, {
          name,
          email: emailLower,
          phone: phone || "",
          createdAt: new Date().toISOString(),
          referredBy: "",
          uniqueId,
          sponsorId: sponsorUniqueId || "",
          walletCoins: 0,
        });

        Earnings.awardJoiningBonus(cred.user.uid).catch(() => {});

        if (sponsorUniqueId) {
          const sponsor = await Users.getByUniqueId(sponsorUniqueId);
          if (sponsor) {
            Earnings.awardReferralSignupBonus(sponsor.id, cred.user.uid, name).catch(() => {});
          }
        }
      } catch (saveErr) {
        console.warn("Failed to save profile to Firestore:", saveErr);
      }
      setUser({ id: cred.user.uid, name, email: emailLower, phone: phone || "" });
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error("Email already in use");
      }
      if (err.code === "auth/weak-password") {
        throw new Error("Password should be at least 6 characters");
      }
      throw new Error(err.message || "Failed to create account");
    }
  }

  async function updateProfileFn(data: UpdateProfileData) {
    if (!user) throw new Error("Not logged in");
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Not authenticated");

    if (data.currentPassword) {
      const credential = EmailAuthProvider.credential(firebaseUser.email!, data.currentPassword);
      try {
        await reauthenticateWithCredential(firebaseUser, credential);
      } catch {
        throw new Error("Current password is incorrect");
      }
    }

    if (data.email && data.email.toLowerCase().trim() !== firebaseUser.email) {
      await updateEmail(firebaseUser, data.email.toLowerCase().trim());
    }

    if (data.newPassword) {
      await updatePassword(firebaseUser, data.newPassword);
    }

    const updates: Record<string, string> = {};
    if (data.name && data.name.trim()) updates.name = data.name.trim();
    if (data.email && data.email.trim()) updates.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) updates.phone = data.phone;

    if (Object.keys(updates).length > 0) {
      const updated = await Users.update(user.id, updates);
      if (updated) {
        setUser({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone });
      }
    }
  }

  async function logout() {
    await removePushToken();
    await signOut(auth);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      updateProfile: updateProfileFn,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
