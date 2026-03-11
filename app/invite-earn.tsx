import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import ImageCropModal from "@/components/ImageCropModal";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Users, Wallet, MyNetwork, Earnings } from "@/lib/firestore";

import type { WalletTransaction, UserProfile, NetworkMember, EarningRecord } from "@/lib/firestore";

const CLOUDINARY_CLOUD = "dfiwh5cqr";
const CLOUDINARY_PRESET = "idigital";

const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA3UAPUckG8490GTR8JOxsqvZwI8oS1L7Q",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "digiindia-7a462.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "digiindia-7a462",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "digiindia-7a462.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1075298164237",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1075298164237:web:6a5ca0878dda7334523f44",
};

const REDEEM_PRESETS = [100, 200, 500, 1000];

export default function MyNetworkScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletCoins, setWalletCoins] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [downline, setDownline] = useState<UserProfile[]>([]);
  const [networkMembers, setNetworkMembers] = useState<NetworkMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [redeemVisible, setRedeemVisible] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [activeSection, setActiveSection] = useState<"network" | "earning">("network");
  const [earningRecords, setEarningRecords] = useState<EarningRecord[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [joiningBonusTotal, setJoiningBonusTotal] = useState(0);
  const [referralBonusTotal, setReferralBonusTotal] = useState(0);
  const [commissionTotal, setCommissionTotal] = useState(0);

  const [regVisible, setRegVisible] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");

  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingPhotoSize, setPendingPhotoSize] = useState<{ w: number; h: number } | null>(null);
  const [croppedPhoto, setCroppedPhoto] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberDownline, setMemberDownline] = useState<Record<string, { user: UserProfile; level: number }[]>>({});
  const [expandingMember, setExpandingMember] = useState<string | null>(null);
  const [memberCommission, setMemberCommission] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [prof, txns, members, earnings] = await Promise.all([
        Users.getById(user.id),
        Wallet.getTransactions(user.id),
        MyNetwork.getMembers(user.id),
        Earnings.getByUser(user.id),
      ]);
      setProfile(prof);
      setWalletCoins(prof?.walletCoins || 0);
      setNetworkMembers(members);
      if (prof?.photoURL) setPhotoURL(prof.photoURL);
      const coinTxns = txns.filter(
        (t) => t.type === "referral_reward" || t.type === "bonus" || t.type === "redemption"
      );
      setTransactions(coinTxns);
      setEarningRecords(earnings);
      let jb = 0, rb = 0, ct = 0;
      for (const e of earnings) {
        if (e.type === "joining_bonus") jb += e.amount;
        else if (e.type === "referral_signup_bonus") rb += e.amount;
        else if (e.type === "level_commission") ct += e.amount;
      }
      setJoiningBonusTotal(jb);
      setReferralBonusTotal(rb);
      setCommissionTotal(ct);
      setTotalEarnings(jb + rb + ct);

      const commByMember: Record<string, number> = {};
      for (const e of earnings) {
        if (e.fromUserId) {
          commByMember[e.fromUserId] = (commByMember[e.fromUserId] || 0) + e.amount;
        }
      }
      setMemberCommission(commByMember);

      if (prof?.uniqueId) {
        const dl = await Users.getBySponsorId(prof.uniqueId);
        setDownline(dl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (isLoading || !isAuthenticated) return null;

  const uniqueId = profile?.uniqueId || "";
  const rupeeEquivalent = (walletCoins / 100) * 10;

  async function pickPhoto() {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPendingPhoto(asset.uri);
    setPendingPhotoSize({ w: asset.width, h: asset.height });
    setCroppedPhoto(null);
    setShowCropModal(true);
  }

  function handleCropDone(croppedUri: string) {
    setCroppedPhoto(croppedUri);
    setShowCropModal(false);
  }

  function handleReCrop() {
    setShowCropModal(true);
  }

  function cancelPhoto() {
    setPendingPhoto(null);
    setPendingPhotoSize(null);
    setCroppedPhoto(null);
    setShowCropModal(false);
  }

  async function confirmUploadPhoto() {
    if (!user) return;
    const uriToUpload = croppedPhoto || pendingPhoto;
    if (!uriToUpload) {
      console.error("UPLOAD: No URI to upload", { croppedPhoto, pendingPhoto });
      Alert.alert("Upload Error", "No photo to upload. Please try again.");
      return;
    }
    setPhotoUploading(true);
    setCroppedPhoto(null);
    setPendingPhoto(null);
    setPendingPhotoSize(null);
    setShowCropModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const formData = new FormData();
      if (uriToUpload.startsWith("data:")) {
        formData.append("file", uriToUpload);
      } else if (Platform.OS === "web") {
        const response = await fetch(uriToUpload);
        const blob = await response.blob();
        formData.append("file", blob, "photo.jpg");
      } else {
        formData.append("file", { uri: uriToUpload, type: "image/jpeg", name: "photo.jpg" } as any);
      }
      formData.append("upload_preset", CLOUDINARY_PRESET);
      formData.append("public_id", `profile-photos/${user.id}_${Date.now()}`);
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) {
        throw new Error(uploadData.error?.message || "No URL returned from Cloudinary");
      }
      await Users.update(user.id, { photoURL: uploadData.secure_url });
      setPhotoURL(uploadData.secure_url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Photo upload error:", err);
      Alert.alert("Upload failed", err?.message || "Could not upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function toggleMemberExpand(memberId: string, memberUniqueId?: string) {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
      return;
    }
    setExpandedMemberId(memberId);
    if (!memberUniqueId || memberDownline[memberId]) return;
    setExpandingMember(memberId);
    try {
      const allDownline: { user: UserProfile; level: number }[] = [];
      const l2Members = await Users.getBySponsorId(memberUniqueId);
      for (const m of l2Members) {
        allDownline.push({ user: m, level: 2 });
      }
      const l3Promises = l2Members
        .filter((m) => m.uniqueId)
        .map((m) => Users.getBySponsorId(m.uniqueId!));
      const l3Results = await Promise.all(l3Promises);
      for (const l3Members of l3Results) {
        for (const m of l3Members) {
          allDownline.push({ user: m, level: 3 });
        }
      }
      setMemberDownline((prev) => ({ ...prev, [memberId]: allDownline }));
    } catch {
      setMemberDownline((prev) => ({ ...prev, [memberId]: [] }));
    } finally {
      setExpandingMember(null);
    }
  }

  async function handleCopyId() {
    if (!uniqueId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(uniqueId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleShare() {
    if (!uniqueId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Hey! Join iDigitalZone using my Sponsor ID: ${uniqueId} and start your digital journey!\n\nhttps://idigitalzone.app`,
      });
    } catch {}
  }

  function openRegisterModal() {
    setRegName("");
    setRegEmail("");
    setRegPhone("");
    setRegPassword("");
    setRegShowPassword(false);
    setRegError("");
    setRegVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function handleRegisterMember() {
    setRegError("");
    if (!regName.trim()) { setRegError("Please enter full name"); return; }
    if (!regEmail.trim() || !/\S+@\S+\.\S+/.test(regEmail.trim())) { setRegError("Please enter a valid email"); return; }
    if (!regPhone.trim() || !/^\d{10,}$/.test(regPhone.trim().replace(/[^0-9]/g, ""))) { setRegError("Please enter a valid phone number (min 10 digits)"); return; }
    if (!regPassword.trim() || regPassword.length < 6) { setRegError("Password must be at least 6 characters"); return; }
    if (!user || !uniqueId) return;

    setRegistering(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const emailLower = regEmail.toLowerCase().trim();
    const phoneCleaned = regPhone.trim().replace(/[^0-9]/g, "");

    let secondaryApp;
    try {
      const existingApps = getApps();
      const existing = existingApps.find((a) => a.name === "registerMember");
      if (existing) await deleteApp(existing);

      secondaryApp = initializeApp(FIREBASE_CONFIG, "registerMember");
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, emailLower, regPassword);
      const newUid = cred.user.uid;

      let newUniqueId = "";
      try {
        newUniqueId = await Users.generateUniqueId();
      } catch (e) {
        console.warn("Failed to generate uniqueId:", e);
      }

      if (!newUniqueId) {
        setRegError("Failed to generate member ID. Please try again.");
        await secondaryAuth.signOut();
        return;
      }

      await Users.save(newUid, {
        name: regName.trim(),
        email: emailLower,
        phone: phoneCleaned,
        createdAt: new Date().toISOString(),
        referredBy: "",
        uniqueId: newUniqueId,
        sponsorId: uniqueId,
        walletCoins: 0,
      });

      Earnings.awardJoiningBonus(newUid).catch(() => {});
      Earnings.awardReferralSignupBonus(user.id, newUid, regName.trim()).catch(() => {});

      await MyNetwork.addMember(user.id, uniqueId, newUniqueId);

      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);
      secondaryApp = null;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Registered!", `${regName.trim()} has been registered and added to your network with ID: ${newUniqueId}`);
      setRegVisible(false);
      await loadData();
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setRegError("This email is already registered");
      } else if (err.code === "auth/weak-password") {
        setRegError("Password should be at least 6 characters");
      } else {
        setRegError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch {}
      }
      setRegistering(false);
    }
  }

  async function handleRemoveMember(member: NetworkMember) {
    Alert.alert(
      "Remove Member",
      `Remove ${member.memberName} from your network?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await MyNetwork.removeMember(member.id);
              await loadData();
            } catch {
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  }

  function handlePresetTap(amount: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(amount);
    setRedeemAmount(String(amount));
  }

  function handleRedeemAmountChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, "");
    setRedeemAmount(cleaned);
    const num = parseInt(cleaned, 10);
    setSelectedPreset(REDEEM_PRESETS.includes(num) ? num : null);
  }

  async function handleRedeem() {
    const coins = parseInt(redeemAmount, 10);
    if (isNaN(coins) || coins <= 0 || !user) return;
    setRedeeming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await Wallet.redeemCoins(user.id, coins);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Redeemed!", result.message);
        setRedeemVisible(false);
        setRedeemAmount("");
        setSelectedPreset(null);
        await loadData();
      } else {
        Alert.alert("Cannot Redeem", result.message);
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setRedeeming(false);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  }

  const redeemCoinsNum = parseInt(redeemAmount, 10) || 0;
  const redeemValid = redeemCoinsNum >= 100 && redeemCoinsNum % 100 === 0 && redeemCoinsNum <= walletCoins;
  const allNetworkCount = downline.length + networkMembers.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Network</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} colors={[colors.tint]} progressBackgroundColor={colors.card} />
        }
      >
        <LinearGradient
          colors={["#1E3A5C", "#2563EB", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.profileCardGlow} />
          <View style={styles.profileCardHighlight} />

          <View style={styles.profileCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileCardName} numberOfLines={1}>
                {profile?.name || user?.name || ""}
              </Text>
              <View style={styles.profileCardIdRow}>
                <Text style={styles.profileCardIdLabel}>DZ ID : </Text>
                <Text style={styles.profileCardIdValue}>{uniqueId || "\u2014"}</Text>
              </View>

              <View style={styles.profileCardDivider} />

              <View style={styles.profileCardStats}>
                <View style={styles.profileCardStat}>
                  <Text style={styles.profileCardStatValue}>{allNetworkCount}</Text>
                  <Text style={styles.profileCardStatLabel}>MY NETWORK</Text>
                </View>
                <View style={styles.profileCardStatSep} />
                <View style={styles.profileCardStat}>
                  <Text style={styles.profileCardStatValue}>{walletCoins.toLocaleString()}</Text>
                  <Text style={styles.profileCardStatLabel}>Digi Points</Text>
                </View>
              </View>
            </View>

            <Pressable style={styles.profilePhotoWrapOuter} onPress={pickPhoto}>
              <View style={styles.profilePhotoWrap}>
                {photoUploading ? (
                  <View style={styles.profilePhotoPlaceholder}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                ) : photoURL ? (
                  <Image key={photoURL} source={{ uri: photoURL }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Ionicons name="person-outline" size={28} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
                <View style={styles.profilePhotoUploadBadge}>
                  <Ionicons name="camera" size={11} color="#FFF" />
                </View>
              </View>
              <Text style={styles.profilePhotoUploadLabel}>
                {photoUploading ? "Uploading..." : "Upload Photo"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.profileCardSignature}>iDigitalZone</Text>
        </LinearGradient>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            <Pressable
              style={[styles.errorRetryBtn, { backgroundColor: colors.tint }]}
              onPress={() => { setError(null); setLoading(true); loadData(); }}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.errorRetryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginVertical: 40 }} />
        ) : (
          <>
            <View style={[styles.idCard, { backgroundColor: isDark ? "#0F1A2E" : "#EFF6FF", borderColor: isDark ? "#1E3A5C" : "#BFDBFE" }]}>
              <View style={styles.idCardTop}>
                <View>
                  <Text style={[styles.idCardLabel, { color: colors.textSecondary }]}>Your Sponsor ID</Text>
                  <Text style={[styles.idCardValue, { color: colors.text }]}>{uniqueId || "\u2014"}</Text>
                </View>
                <View style={styles.idCardActions}>
                  <Pressable
                    style={[styles.idCardBtn, { backgroundColor: codeCopied ? "#22C55E" : "#3B82F6" }]}
                    onPress={handleCopyId}
                    disabled={!uniqueId}
                  >
                    <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={16} color="#FFF" />
                    <Text style={styles.idCardBtnText}>{codeCopied ? "Copied" : "Copy"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.idCardBtn, { backgroundColor: isDark ? "#1E40AF" : "#6366F1" }]}
                    onPress={handleShare}
                    disabled={!uniqueId}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#FFF" />
                    <Text style={styles.idCardBtnText}>Share</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={[styles.tabsRow, { backgroundColor: isDark ? "#0F1A2E" : "#EFF6FF", borderColor: isDark ? "#1E3A5C" : "#BFDBFE" }]}>
              <Pressable
                style={[styles.tabBtn, activeSection === "network" && { backgroundColor: "#3B82F6" }]}
                onPress={() => setActiveSection("network")}
              >
                <Ionicons name="people" size={16} color={activeSection === "network" ? "#FFF" : colors.textSecondary} />
                <Text style={[styles.tabBtnText, { color: activeSection === "network" ? "#FFF" : colors.textSecondary }]}>
                  Network
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabBtn, activeSection === "earning" && { backgroundColor: "#3B82F6" }]}
                onPress={() => setActiveSection("earning")}
              >
                <Ionicons name="wallet" size={16} color={activeSection === "earning" ? "#FFF" : colors.textSecondary} />
                <Text style={[styles.tabBtnText, { color: activeSection === "earning" ? "#FFF" : colors.textSecondary }]}>
                  My Earning
                </Text>
              </Pressable>
            </View>

            {activeSection === "network" ? (
              <View style={styles.sectionWrap}>
                <Pressable
                  style={({ pressed }) => [styles.addMemberBtn, { backgroundColor: "#3B82F6", opacity: pressed ? 0.85 : 1 }]}
                  onPress={openRegisterModal}
                >
                  <Ionicons name="person-add" size={18} color="#FFF" />
                  <Text style={styles.addMemberBtnText}>Register Member</Text>
                </Pressable>

                {(() => {
                  const registeredIds = new Set(networkMembers.map((m) => m.memberUniqueId));
                  return downline.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Direct Referrals</Text>
                      {downline.map((member, i) => {
                        const isExpanded = expandedMemberId === member.id;
                        const dl = memberDownline[member.id];
                        const isRegistered = member.uniqueId ? registeredIds.has(member.uniqueId) : false;
                        return (
                          <View key={member.id}>
                            {i > 0 && <View style={styles.memberSep} />}
                            <Pressable
                              style={[styles.memberRow, { backgroundColor: isDark ? "#0F1A2E" : "#F8FAFF", borderColor: isDark ? "#1E3A5C" : "#DBEAFE" }]}
                              onPress={() => toggleMemberExpand(member.id, member.uniqueId)}
                            >
                              <View style={[styles.memberAvatar, { backgroundColor: isDark ? "#132F4C" : "#DBEAFE" }]}>
                                <Text style={[styles.memberAvatarText, { color: "#3B82F6" }]}>
                                  {(member.name || "?").charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.memberInfo}>
                                <View style={styles.memberNameRow}>
                                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{member.name}</Text>
                                  {isRegistered && (
                                    <View style={styles.registeredTag}>
                                      <Text style={styles.registeredTagText}>Registered</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.memberMeta, { color: colors.textSecondary }]}>
                                  {member.uniqueId || "\u2014"} {member.createdAt ? `\u2022 Joined ${formatDate(member.createdAt)}` : ""}
                                </Text>
                              </View>
                              <Text style={[styles.memberEarningAmount, { color: "#10B981" }]}>
                                {"\u20B9"}{memberCommission[member.id] ?? 0}
                              </Text>
                              {expandingMember === member.id ? (
                                <ActivityIndicator size="small" color={colors.textSecondary} />
                              ) : (
                                <Ionicons
                                  name={isExpanded ? "chevron-up" : "chevron-down"}
                                  size={18}
                                  color={colors.textSecondary}
                                />
                              )}
                            </Pressable>
                            {isExpanded && (
                              <View style={[styles.downlineExpand, { backgroundColor: isDark ? "#0A1222" : "#F0F5FF", borderColor: isDark ? "#1E3A5C" : "#DBEAFE" }]}>
                                {!dl && expandingMember === member.id ? (
                                  <ActivityIndicator size="small" color={colors.tint} style={{ paddingVertical: 12 }} />
                                ) : dl && dl.length > 0 ? (
                                  dl.map((sub, j) => (
                                    <View key={sub.user.id} style={[styles.subMemberRow, j > 0 && { borderTopWidth: 1, borderTopColor: isDark ? "#1E3A5C" : "#DBEAFE" }]}>
                                      <View style={[styles.subMemberAvatar, { backgroundColor: isDark ? "#1A2D44" : "#E0EDFF" }]}>
                                        <Text style={[styles.subMemberAvatarText, { color: sub.level === 2 ? "#6366F1" : "#0EA5E9" }]}>
                                          {(sub.user.name || "?").charAt(0).toUpperCase()}
                                        </Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <View style={styles.memberNameRow}>
                                          <Text style={[styles.subMemberName, { color: colors.text }]} numberOfLines={1}>{sub.user.name}</Text>
                                          <View style={[styles.levelTag, { backgroundColor: sub.level === 2 ? "#6366F1" : "#0EA5E9" }]}>
                                            <Text style={styles.levelTagText}>L{sub.level}</Text>
                                          </View>
                                        </View>
                                        <Text style={[styles.subMemberMeta, { color: colors.textSecondary }]}>
                                          {sub.user.uniqueId || "\u2014"} {sub.user.createdAt ? `\u2022 ${formatDate(sub.user.createdAt)}` : ""}
                                        </Text>
                                      </View>
                                    </View>
                                  ))
                                ) : (
                                  <Text style={[styles.noDownlineText, { color: colors.textSecondary }]}>No downline members</Text>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}

                {downline.length === 0 && networkMembers.length === 0 && (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#132F4C" : "#DBEAFE" }]}>
                      <Ionicons name="people-outline" size={32} color="#60A5FA" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No members yet</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Register members to build your network!</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.sectionWrap}>
                <LinearGradient
                  colors={isDark ? ["#0C1929", "#132F4C", "#1A3A5C"] : ["#EFF6FF", "#DBEAFE", "#BFDBFE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.earnSummaryCard}
                >
                  <View style={styles.earnSummaryHeader}>
                    <View style={[styles.earnSummaryIconWrap, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                      <Ionicons name="trending-up" size={22} color="#3B82F6" />
                    </View>
                    <Text style={[styles.earnSummaryLabel, { color: isDark ? "rgba(255,255,255,0.6)" : "#1E40AF" }]}>Total Earnings</Text>
                  </View>
                  <Text style={[styles.earnSummaryAmount, { color: isDark ? "#FFF" : "#1E3A5F" }]}>
                    {"\u20B9"}{totalEarnings.toFixed(0)}
                  </Text>

                  <View style={[styles.earnBreakdownRow, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(30,64,175,0.1)" }]}>
                    <View style={styles.earnBreakdownItem}>
                      <View style={[styles.earnBreakdownDot, { backgroundColor: "#60A5FA" }]} />
                      <Text style={[styles.earnBreakdownLabel, { color: isDark ? "rgba(255,255,255,0.5)" : "#1E40AF" }]}>Joining</Text>
                      <Text style={[styles.earnBreakdownValue, { color: isDark ? "#FFF" : "#1E3A5F" }]}>{"\u20B9"}{joiningBonusTotal.toFixed(0)}</Text>
                    </View>
                    <View style={[styles.earnBreakdownSep, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(30,64,175,0.1)" }]} />
                    <View style={styles.earnBreakdownItem}>
                      <View style={[styles.earnBreakdownDot, { backgroundColor: "#818CF8" }]} />
                      <Text style={[styles.earnBreakdownLabel, { color: isDark ? "rgba(255,255,255,0.5)" : "#1E40AF" }]}>Referral</Text>
                      <Text style={[styles.earnBreakdownValue, { color: isDark ? "#FFF" : "#1E3A5F" }]}>{"\u20B9"}{referralBonusTotal.toFixed(0)}</Text>
                    </View>
                    <View style={[styles.earnBreakdownSep, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(30,64,175,0.1)" }]} />
                    <View style={styles.earnBreakdownItem}>
                      <View style={[styles.earnBreakdownDot, { backgroundColor: "#38BDF8" }]} />
                      <Text style={[styles.earnBreakdownLabel, { color: isDark ? "rgba(255,255,255,0.5)" : "#1E40AF" }]}>Commission</Text>
                      <Text style={[styles.earnBreakdownValue, { color: isDark ? "#FFF" : "#1E3A5F" }]}>{"\u20B9"}{commissionTotal.toFixed(0)}</Text>
                    </View>
                  </View>
                </LinearGradient>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 4 }]}>Commission Structure</Text>
                <View style={styles.commStructureRow}>
                  {[
                    { level: "L1", rate: "5%", color: "#3B82F6", bg: isDark ? "#3B82F615" : "#EFF6FF", border: isDark ? "#3B82F630" : "#3B82F640", label: "Direct" },
                    { level: "L2", rate: "2.5%", color: "#6366F1", bg: isDark ? "#6366F115" : "#EEF2FF", border: isDark ? "#6366F130" : "#6366F140", label: "2nd Level" },
                    { level: "L3", rate: "1%", color: "#0EA5E9", bg: isDark ? "#0EA5E915" : "#F0F9FF", border: isDark ? "#0EA5E930" : "#0EA5E940", label: "3rd Level" },
                  ].map((item) => (
                    <View key={item.level} style={[styles.commCard, { backgroundColor: item.bg, borderColor: item.border }]}>
                      <View style={[styles.commBadge, { backgroundColor: item.color }]}>
                        <Text style={styles.commBadgeText}>{item.level}</Text>
                      </View>
                      <Text style={[styles.commRate, { color: item.color }]}>{item.rate}</Text>
                      <Text style={[styles.commLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.hiwCard, { backgroundColor: isDark ? "#0F1A2E" : "#F8FAFF", borderColor: isDark ? "#1E3A5C" : "#DBEAFE" }]}>
                  <View style={styles.hiwHeader}>
                    <Ionicons name="bulb" size={18} color="#60A5FA" />
                    <Text style={[styles.hiwTitle, { color: colors.text }]}>How It Works</Text>
                  </View>

                  <View style={styles.hiwStep}>
                    <View style={[styles.hiwStepDot, { backgroundColor: "#3B82F6" }]}>
                      <Text style={styles.hiwStepNum}>1</Text>
                    </View>
                    <View style={styles.hiwStepContent}>
                      <Text style={[styles.hiwStepTitle, { color: colors.text }]}>Join & Earn {"\u20B9"}20</Text>
                      <Text style={[styles.hiwStepDesc, { color: colors.textSecondary }]}>Every new member gets {"\u20B9"}20 joining bonus instantly</Text>
                    </View>
                  </View>
                  <View style={[styles.hiwConnector, { borderLeftColor: isDark ? "#1E3A5C" : "#BFDBFE" }]} />

                  <View style={styles.hiwStep}>
                    <View style={[styles.hiwStepDot, { backgroundColor: "#6366F1" }]}>
                      <Text style={styles.hiwStepNum}>2</Text>
                    </View>
                    <View style={styles.hiwStepContent}>
                      <Text style={[styles.hiwStepTitle, { color: colors.text }]}>Refer & Earn {"\u20B9"}10</Text>
                      <Text style={[styles.hiwStepDesc, { color: colors.textSecondary }]}>You get {"\u20B9"}10 when someone joins using your Sponsor ID</Text>
                    </View>
                  </View>
                  <View style={[styles.hiwConnector, { borderLeftColor: isDark ? "#1E3A5C" : "#BFDBFE" }]} />

                  <View style={styles.hiwStep}>
                    <View style={[styles.hiwStepDot, { backgroundColor: "#0EA5E9" }]}>
                      <Text style={styles.hiwStepNum}>3</Text>
                    </View>
                    <View style={styles.hiwStepContent}>
                      <Text style={[styles.hiwStepTitle, { color: colors.text }]}>Earn on Purchases</Text>
                      <Text style={[styles.hiwStepDesc, { color: colors.textSecondary }]}>When your network buys a service, you earn commission up to 3 levels deep</Text>
                    </View>
                  </View>

                  <View style={[styles.hiwChainBox, { backgroundColor: isDark ? "#132F4C" : "#EFF6FF", borderColor: isDark ? "#1E3A5C" : "#BFDBFE" }]}>
                    <Text style={[styles.hiwChainTitle, { color: colors.textSecondary }]}>Example: Someone in your network buys {"\u20B9"}1000 service</Text>
                    <View style={styles.hiwChainRow}>
                      <View style={styles.hiwChainItem}>
                        <View style={[styles.hiwChainIcon, { backgroundColor: "#3B82F615" }]}>
                          <Text style={[styles.hiwChainEmoji, { color: "#3B82F6" }]}>You</Text>
                        </View>
                        <Text style={[styles.hiwChainLabel, { color: colors.textSecondary }]}>L1 Sponsor</Text>
                        <Text style={[styles.hiwChainValue, { color: "#3B82F6" }]}>{"\u20B9"}50</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={14} color={isDark ? "#60A5FA" : "#93C5FD"} style={{ marginTop: 10 }} />
                      <View style={styles.hiwChainItem}>
                        <View style={[styles.hiwChainIcon, { backgroundColor: "#6366F115" }]}>
                          <Text style={[styles.hiwChainEmoji, { color: "#6366F1" }]}>L2</Text>
                        </View>
                        <Text style={[styles.hiwChainLabel, { color: colors.textSecondary }]}>Your Sponsor</Text>
                        <Text style={[styles.hiwChainValue, { color: "#6366F1" }]}>{"\u20B9"}25</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={14} color={isDark ? "#60A5FA" : "#93C5FD"} style={{ marginTop: 10 }} />
                      <View style={styles.hiwChainItem}>
                        <View style={[styles.hiwChainIcon, { backgroundColor: "#0EA5E915" }]}>
                          <Text style={[styles.hiwChainEmoji, { color: "#0EA5E9" }]}>L3</Text>
                        </View>
                        <Text style={[styles.hiwChainLabel, { color: colors.textSecondary }]}>Their Sponsor</Text>
                        <Text style={[styles.hiwChainValue, { color: "#0EA5E9" }]}>{"\u20B9"}10</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.coinCard, { backgroundColor: isDark ? "#0F1A2E" : "#EFF6FF", borderColor: isDark ? "#1E3A5C" : "#BFDBFE" }]}>
                  <View style={styles.coinCardTop}>
                    <View style={styles.coinCardLeft}>
                      <View style={[styles.coinIconWrap, { backgroundColor: "#3B82F620" }]}>
                        <Ionicons name="wallet" size={24} color="#3B82F6" />
                      </View>
                      <View>
                        <Text style={[styles.coinCardLabel, { color: colors.textSecondary }]}>Digi Points</Text>
                        <Text style={[styles.coinCardValue, { color: colors.text }]}>{walletCoins.toLocaleString()}</Text>
                        <Text style={[styles.coinCardSub, { color: colors.textSecondary }]}>
                          Worth {"\u20B9"}{rupeeEquivalent.toFixed(0)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.redeemBtn,
                        {
                          backgroundColor: walletCoins >= 100 ? "#3B82F6" : isDark ? "#374151" : "#E5E7EB",
                          opacity: pressed && walletCoins >= 100 ? 0.85 : 1,
                        },
                      ]}
                      onPress={() => {
                        if (walletCoins >= 100) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setRedeemVisible(true);
                        } else {
                          Alert.alert("Not Enough Coins", "You need at least 100 coins to redeem.");
                        }
                      }}
                    >
                      <Ionicons name="swap-horizontal" size={16} color={walletCoins >= 100 ? "#FFF" : colors.textSecondary} />
                      <Text style={[styles.redeemBtnText, { color: walletCoins >= 100 ? "#FFF" : colors.textSecondary }]}>Redeem</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.coinInfoRow, { borderTopColor: isDark ? "#1E3A5C" : "#BFDBFE" }]}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.coinInfoText, { color: colors.textSecondary }]}>100 coins = {"\u20B9"}10 (added to your wallet balance)</Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Earnings History</Text>
                {earningRecords.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#0F1A2E" : "#EFF6FF" }]}>
                      <Ionicons name="wallet-outline" size={32} color="#60A5FA" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No earnings yet</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Build your network and earn commissions!</Text>
                  </View>
                ) : (
                  earningRecords.map((rec, i) => {
                    const isJoining = rec.type === "joining_bonus";
                    const isReferral = rec.type === "referral_signup_bonus";
                    const iconName = isJoining ? "gift" : isReferral ? "person-add" : "trending-up";
                    const iconColor = isJoining ? "#3B82F6" : isReferral ? "#6366F1" : "#0EA5E9";
                    const iconBg = isJoining ? "#3B82F610" : isReferral ? "#6366F110" : "#0EA5E910";
                    const desc = isJoining
                      ? "Joining Bonus"
                      : isReferral
                        ? `${rec.fromUserName} joined`
                        : `L${rec.level} from ${rec.fromUserName}`;
                    return (
                      <View key={rec.id}>
                        {i > 0 && <View style={[styles.txnSep, { backgroundColor: colors.border }]} />}
                        <View style={styles.txnRow}>
                          <View style={[styles.txnIcon, { backgroundColor: iconBg }]}>
                            <Ionicons name={iconName as any} size={16} color={iconColor} />
                          </View>
                          <View style={styles.txnInfo}>
                            <Text style={[styles.txnDesc, { color: colors.text }]} numberOfLines={1}>{desc}</Text>
                            <Text style={[styles.txnDate, { color: colors.textSecondary }]}>{formatDate(rec.createdAt)}</Text>
                          </View>
                          <View style={styles.txnRight}>
                            <Text style={[styles.txnAmount, { color: "#3B82F6" }]}>
                              +{"\u20B9"}{rec.amount % 1 === 0 ? rec.amount.toFixed(0) : rec.amount.toFixed(2)}
                            </Text>
                            {rec.level > 0 && (
                              <View style={[styles.earnLevelTag, { backgroundColor: iconBg }]}>
                                <Text style={[styles.earnLevelTagText, { color: iconColor }]}>Level {rec.level}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      <Modal visible={regVisible} transparent animationType="slide" onRequestClose={() => setRegVisible(false)}>
        <View style={styles.regOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
            <View style={[styles.regBox, { backgroundColor: colors.card }]}>
              <View style={styles.regHeader}>
                <Text style={[styles.regTitle, { color: colors.text }]}>Register Member</Text>
                <Pressable onPress={() => setRegVisible(false)} hitSlop={12}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={[styles.regSubtitle, { color: colors.textSecondary }]}>
                Create an account for a new member. They will be added to your network with you as their sponsor.
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
                <View>
                  <Text style={[styles.regLabel, { color: colors.textSecondary }]}>Full Name *</Text>
                  <View style={[styles.regInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={18} color={colors.placeholder} />
                    <TextInput
                      style={[styles.regInput, { color: colors.text }]}
                      placeholder="Enter full name"
                      placeholderTextColor={colors.placeholder}
                      value={regName}
                      onChangeText={setRegName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.regLabel, { color: colors.textSecondary }]}>Email *</Text>
                  <View style={[styles.regInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Ionicons name="mail-outline" size={18} color={colors.placeholder} />
                    <TextInput
                      style={[styles.regInput, { color: colors.text }]}
                      placeholder="email@example.com"
                      placeholderTextColor={colors.placeholder}
                      value={regEmail}
                      onChangeText={setRegEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.regLabel, { color: colors.textSecondary }]}>Phone Number *</Text>
                  <View style={[styles.regInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Ionicons name="call-outline" size={18} color={colors.placeholder} />
                    <TextInput
                      style={[styles.regInput, { color: colors.text }]}
                      placeholder="9876543210"
                      placeholderTextColor={colors.placeholder}
                      value={regPhone}
                      onChangeText={setRegPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View>
                  <Text style={[styles.regLabel, { color: colors.textSecondary }]}>Password *</Text>
                  <View style={[styles.regInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.placeholder} />
                    <TextInput
                      style={[styles.regInput, { color: colors.text }]}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={colors.placeholder}
                      value={regPassword}
                      onChangeText={setRegPassword}
                      secureTextEntry={!regShowPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setRegShowPassword(!regShowPassword)} hitSlop={12}>
                      <Ionicons name={regShowPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.placeholder} />
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.regSponsorInfo, { backgroundColor: isDark ? "#0F766E20" : "#14B8A610", borderColor: isDark ? "#14B8A630" : "#14B8A640" }]}>
                  <Ionicons name="link" size={16} color="#14B8A6" />
                  <Text style={[styles.regSponsorText, { color: colors.text }]}>Sponsor ID: <Text style={{ fontFamily: "Inter_700Bold", color: "#14B8A6" }}>{uniqueId}</Text></Text>
                </View>

                {!!regError && (
                  <View style={[styles.regErrorBox, { backgroundColor: "#EF444415" }]}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.regErrorText}>{regError}</Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [styles.regSubmitBtn, { backgroundColor: colors.tint, opacity: pressed ? 0.9 : 1 }]}
                  onPress={handleRegisterMember}
                  disabled={registering}
                >
                  {registering ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.regSubmitText}>Register & Add to Network</Text>
                  )}
                </Pressable>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ImageCropModal
        visible={showCropModal}
        imageUri={pendingPhoto}
        imageWidth={pendingPhotoSize?.w || 0}
        imageHeight={pendingPhotoSize?.h || 0}
        onCropDone={handleCropDone}
        onCancel={cancelPhoto}
      />

      <Modal visible={!!croppedPhoto && !showCropModal} transparent animationType="fade" onRequestClose={cancelPhoto}>
        <View style={styles.photoPreviewOverlay}>
          <View style={styles.photoPreviewBox}>
            <Text style={styles.photoPreviewTitle}>Photo Preview</Text>
            <Text style={styles.photoPreviewSub}>
              Cropped to square — ready to upload
            </Text>

            <Image
              key={croppedPhoto}
              source={{ uri: croppedPhoto || "" }}
              style={styles.photoPreviewImageCropped}
              resizeMode="cover"
            />

            <Pressable style={styles.photoCropBtn} onPress={handleReCrop}>
              <Ionicons name="crop-outline" size={18} color="#7C3AED" />
              <Text style={styles.photoCropBtnText}>Re-Crop</Text>
            </Pressable>

            <Pressable style={styles.photoUploadBtn} onPress={confirmUploadPhoto}>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.photoUploadBtnText}>Upload Photo</Text>
            </Pressable>

            <Pressable style={styles.photoCancelBtn} onPress={cancelPhoto}>
              <Text style={styles.photoCancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={redeemVisible} transparent animationType="fade" onRequestClose={() => setRedeemVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setRedeemVisible(false); }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKAV}>
            <Pressable style={[styles.modalBox, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Redeem Coins</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Available: {walletCoins.toLocaleString()} coins
              </Text>

              <View style={styles.presetGrid}>
                {REDEEM_PRESETS.filter((p) => p <= walletCoins).map((amt) => (
                  <Pressable
                    key={amt}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: selectedPreset === amt ? "#F59E0B15" : isDark ? "#1E293B" : "#F1F5F9",
                        borderColor: selectedPreset === amt ? "#F59E0B" : colors.border,
                      },
                    ]}
                    onPress={() => handlePresetTap(amt)}
                  >
                    <Text style={[styles.presetText, { color: selectedPreset === amt ? "#F59E0B" : colors.text }]}>{amt}</Text>
                    <Text style={[styles.presetSub, { color: colors.textSecondary }]}>= {"\u20B9"}{(amt / 100) * 10}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.customInputWrap, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: colors.border }]}>
                <Ionicons name="logo-bitcoin" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.customInput, { color: colors.text }]}
                  placeholder="Enter coins (multiples of 100)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={redeemAmount}
                  onChangeText={handleRedeemAmountChange}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              {redeemCoinsNum > 0 && (
                <View style={[styles.redeemPreview, { backgroundColor: isDark ? "#06492430" : "#ECFDF5", borderColor: isDark ? "#10B98130" : "#10B98140" }]}>
                  <Text style={[styles.redeemPreviewText, { color: "#10B981" }]}>
                    You'll receive {"\u20B9"}{((redeemCoinsNum / 100) * 10).toFixed(0)} in your wallet
                  </Text>
                </View>
              )}
              {redeemCoinsNum > 0 && redeemCoinsNum % 100 !== 0 && (
                <Text style={[styles.errorHint, { color: "#EF4444" }]}>Must be in multiples of 100</Text>
              )}
              {redeemCoinsNum > walletCoins && (
                <Text style={[styles.errorHint, { color: "#EF4444" }]}>Not enough coins</Text>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.redeemConfirmBtn,
                  {
                    backgroundColor: redeemValid ? "#F59E0B" : isDark ? "#374151" : "#D1D5DB",
                    opacity: pressed && redeemValid ? 0.85 : 1,
                  },
                ]}
                onPress={handleRedeem}
                disabled={!redeemValid || redeeming}
              >
                {redeeming ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.redeemConfirmText, { color: redeemValid ? "#FFF" : colors.textSecondary }]}>
                    {redeemValid ? `Redeem ${redeemCoinsNum} Coins` : "Select coins to redeem"}
                  </Text>
                )}
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  profileCard: {
    borderRadius: 20, padding: 22, marginBottom: 16, overflow: "hidden",
    position: "relative" as const,
    shadowColor: "#1E3A5C", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45, shadowRadius: 28, elevation: 14,
  },
  profileCardGlow: {
    position: "absolute" as const, top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  profileCardHighlight: {
    position: "absolute" as const, top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  profileCardName: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF",
    letterSpacing: 0.2, marginBottom: 5,
  },
  profileCardIdRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  profileCardIdLabel: {
    fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)",
  },
  profileCardIdValue: {
    fontSize: 13, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)",
    letterSpacing: 1,
  },
  profileCardDivider: {
    height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 18,
  },
  profileCardSignature: {
    position: "absolute" as const, bottom: 10, right: 16,
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.2)", letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  downlineExpand: {
    marginTop: 4, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, padding: 10, marginHorizontal: 4,
  },
  subMemberRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 4,
  },
  subMemberAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  subMemberAvatarText: {
    fontSize: 13, fontFamily: "Inter_700Bold",
  },
  subMemberName: {
    fontSize: 13, fontFamily: "Inter_600SemiBold",
  },
  subMemberMeta: {
    fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1,
  },
  noDownlineText: {
    fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center",
    paddingVertical: 12,
  },
  memberNameRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  registeredTag: {
    backgroundColor: "#10B981", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  registeredTagText: {
    fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#FFF",
    textTransform: "uppercase" as const, letterSpacing: 0.5,
  },
  memberEarningAmount: {
    fontSize: 14, fontFamily: "Inter_700Bold", marginRight: 8,
  },
  levelTag: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  levelTagText: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFF",
    letterSpacing: 0.5,
  },
  regSummaryCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  regSummaryRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  regSummaryIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  regSummaryLabel: {
    fontSize: 12, fontFamily: "Inter_400Regular",
  },
  regSummaryValue: {
    fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2,
  },
  regSummaryDivider: {
    height: 1, marginVertical: 12,
  },
  profileCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  profileCardStats: { flexDirection: "row", alignItems: "center" },
  profileCardStat: { flex: 1, alignItems: "center" },
  profileCardStatLabel: {
    fontSize: 9, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 4,
  },
  profileCardStatValue: {
    fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.3,
  },
  profileCardStatSep: {
    width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.18)",
  },
  profilePhotoWrapOuter: {
    alignItems: "center", marginTop: 2,
  },
  profilePhotoWrap: {
    width: 72, height: 72, borderRadius: 36,
    position: "relative" as const,
  },
  profilePhotoUploadLabel: {
    fontSize: 10, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)", marginTop: 5,
    letterSpacing: 0.3, textAlign: "center" as const,
  },
  photoPreviewOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  photoPreviewBox: {
    width: "100%", backgroundColor: "#1A1A2E",
    borderRadius: 20, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.4)",
  },
  photoPreviewTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF",
    marginBottom: 4,
  },
  photoPreviewSub: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)",
    marginBottom: 16, textAlign: "center" as const,
  },
  photoPreviewImage: {
    width: "100%", height: 280, borderRadius: 14, marginBottom: 20,
  },
  photoPreviewImageCropped: {
    width: "100%" as any, aspectRatio: 1,
    borderRadius: 14, marginBottom: 20,
  },
  photoCropBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1.5, borderColor: "#7C3AED",
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
    width: "100%", marginBottom: 10, gap: 8,
  },
  photoCropBtnText: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#7C3AED", letterSpacing: 0.3,
  },
  photoUploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#7C3AED", borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24, width: "100%",
    marginBottom: 10, gap: 8,
  },
  photoUploadBtnText: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.3,
  },
  photoCancelBtn: {
    paddingVertical: 10, width: "100%", alignItems: "center",
  },
  photoCancelBtnText: {
    fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.45)",
  },
  profilePhoto: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  profilePhotoPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  profilePhotoUploadBadge: {
    position: "absolute" as const, bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#3B82F6",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
  },

  idCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  idCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  idCardLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 3 },
  idCardValue: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  idCardActions: { flexDirection: "row", gap: 6 },
  idCardBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9,
  },
  idCardBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  tabsRow: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 16, gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  sectionWrap: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 14 },

  addMemberBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14, marginBottom: 20,
  },
  addMemberBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  emptyState: { alignItems: "center", paddingVertical: 36 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  memberRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  memberSep: { height: 8 },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
  },
  memberAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  memberBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  memberBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  coinCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  coinCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  coinCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  coinIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  coinCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  coinCardValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  coinCardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  redeemBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  redeemBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  coinInfoRow: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 12, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  coinInfoText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  txnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  txnDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  txnRight: { alignItems: "flex-end" as const },
  txnAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txnCoinLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  txnSep: { height: StyleSheet.hairlineWidth, marginLeft: 48 },

  regOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  regBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 20,
    maxHeight: "90%",
  },
  regHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 16, marginBottom: 6,
  },
  regTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  regSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 18, lineHeight: 18 },
  regLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginLeft: 4 },
  regInputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14,
    height: 50, gap: 10, borderWidth: 1,
  },
  regInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  regSponsorInfo: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
  },
  regSponsorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  regErrorBox: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12,
  },
  regErrorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#EF4444", flex: 1 },
  regSubmitBtn: {
    height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  regSubmitText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalKAV: { flex: 1, justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 14 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 18 },

  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  presetChip: {
    flex: 1, minWidth: "45%", alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  presetText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  presetSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  customInputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 50, marginBottom: 12, gap: 8,
  },
  customInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },

  redeemPreview: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12, alignItems: "center",
  },
  redeemPreviewText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  redeemConfirmBtn: { alignItems: "center", paddingVertical: 16, borderRadius: 14 },
  redeemConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  hiwCard: {
    padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  hiwHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18,
  },
  hiwTitle: {
    fontSize: 16, fontFamily: "Inter_600SemiBold",
  },
  hiwStep: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  hiwStepDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  hiwStepNum: {
    fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF",
  },
  hiwStepContent: {
    flex: 1, paddingTop: 2,
  },
  hiwStepTitle: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3,
  },
  hiwStepDesc: {
    fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17,
  },
  hiwConnector: {
    width: 0, height: 14, borderLeftWidth: 2, borderStyle: "dashed" as any,
    marginLeft: 13,
  },
  hiwChainBox: {
    marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  hiwChainTitle: {
    fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" as const, marginBottom: 12,
  },
  hiwChainRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 6,
  },
  hiwChainItem: {
    alignItems: "center", flex: 1,
  },
  hiwChainIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  hiwChainEmoji: {
    fontSize: 11, fontFamily: "Inter_700Bold",
  },
  hiwChainLabel: {
    fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 2, textAlign: "center" as const,
  },
  hiwChainValue: {
    fontSize: 15, fontFamily: "Inter_700Bold",
  },

  earnSummaryCard: {
    borderRadius: 18, padding: 20, marginBottom: 16, overflow: "hidden",
  },
  earnSummaryHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6,
  },
  earnSummaryIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  earnSummaryLabel: {
    fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.3,
  },
  earnSummaryAmount: {
    fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 16,
  },
  earnBreakdownRow: {
    flexDirection: "row", alignItems: "center", borderTopWidth: 1, paddingTop: 14,
  },
  earnBreakdownItem: {
    flex: 1, alignItems: "center",
  },
  earnBreakdownDot: {
    width: 8, height: 8, borderRadius: 4, marginBottom: 6,
  },
  earnBreakdownLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4,
  },
  earnBreakdownValue: {
    fontSize: 15, fontFamily: "Inter_700Bold",
  },
  earnBreakdownSep: {
    width: 1, height: 36,
  },
  commStructureRow: {
    flexDirection: "row", gap: 10, marginBottom: 20,
  },
  commCard: {
    flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: 1,
  },
  commBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8,
  },
  commBadgeText: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.5,
  },
  commRate: {
    fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 2,
  },
  commLabel: {
    fontSize: 11, fontFamily: "Inter_400Regular",
  },
  earnLevelTag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3,
  },
  earnLevelTagText: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
  },

  errorContainer: { alignItems: "center" as const, paddingVertical: 60 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" as const, marginTop: 16, marginBottom: 20, paddingHorizontal: 20 },
  errorRetryBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errorRetryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
