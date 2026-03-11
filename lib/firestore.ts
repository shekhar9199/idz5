import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  runTransaction,
  onSnapshot,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import {
  restSetDoc,
  restGetDoc,
  restUpdateDoc,
  restDeleteDoc,
  restGetCollection,
  restQuery,
  restBatchWrite,
  useRest,
} from "./firestore-rest";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function genShortId(prefix: string = "NX") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface ChatData {
  chatId: string;
  userId: string;
  userName: string;
  issueCategory: string;
  issueType: string;
  status: "open" | "resolved";
  lastMessage: string;
  lastMessageTime: string;
  createdAt: string;
  unreadAdmin: number;
  unreadUser: number;
}

export interface ChatMessage {
  messageId: string;
  chatId: string;
  sender: "user" | "admin";
  message: string;
  timestamp: string;
  status: "sent" | "delivered" | "seen";
  imageUri?: string;
  fileName?: string;
  fileType?: string;
}

export interface OrderData {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  service_name: string;
  plan: string;
  price: string;
  status: string;
  details: string;
  created_at: string;
  video_url?: string;
  customer_phone?: string;
  ig_id?: string;
  ig_password?: string;
  refunded?: boolean;
  cancellationReason?: string;
}

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  order_id: string;
  read: boolean;
  created_at: string;
}

export interface OttApp {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: string;
  color: string;
  durationMonths: string;
  durationYear: string;
  outOfStock?: boolean;
  stockCount?: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  name: string;
  email: string;
  requirement: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export interface SubRequest {
  id: string;
  appId: string;
  appName: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  referredBy?: string;
  uniqueId?: string;
  sponsorId?: string;
  walletCoins?: number;
  walletBalance?: number;
  coins?: number;
  suspended?: boolean;
  photoURL?: string;
  lastSpinDate?: string;
  spinsEarned?: number;
  spinsUsed?: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "referral_reward" | "bonus" | "deduction" | "admin_credit" | "redemption" | "withdrawal" | "withdrawal_refund" | "joining_bonus" | "referral_signup_bonus" | "level_commission" | "spin_reward";
  coins: number;
  amountRupees?: number;
  description: string;
  sourceUserId?: string;
  orderId?: string;
  createdAt: string;
}

export interface EarningRecord {
  id: string;
  userId: string;
  fromUserId: string;
  fromUserName: string;
  level: number;
  amount: number;
  orderId?: string;
  type: "joining_bonus" | "referral_signup_bonus" | "level_commission";
  createdAt: string;
}

export interface WalletOrder {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: "pending" | "verification_pending" | "paid" | "rejected";
  utr: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  finalAmount: number;
  upiId: string;
  status: "pending" | "approved" | "failed";
  createdAt: string;
  updatedAt?: string;
}

export interface ReferralReward {
  id: string;
  referrerId: string;
  referredUserId: string;
  orderId: string;
  coins: number;
  createdAt: string;
}

const DEFAULT_OTT_APPS: OttApp[] = [
  { id: "youtube-premium", name: "YouTube Premium", description: "Ad-free videos, background play, and YouTube Music", price: "179", icon: "youtube", color: "#FF0000", durationMonths: "1", durationYear: "", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "amazon-prime", name: "Amazon Prime Video", description: "Thousands of movies, TV shows, and originals", price: "149", icon: "movie-open-outline", color: "#00A8E1", durationMonths: "1", durationYear: "", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "sony-liv", name: "Sony LIV", description: "Live sports, original series, and entertainment", price: "99", icon: "television-play", color: "#1A1A2E", durationMonths: "1", durationYear: "", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "zee5", name: "Zee5", description: "Movies, web series, TV shows, and live TV", price: "79", icon: "play-circle-outline", color: "#8B5CF6", durationMonths: "1", durationYear: "", createdAt: "2026-01-01T00:00:00.000Z" },
];

export const Chats = {
  async create(userId: string, userName: string, issueCategory: string, issueType: string): Promise<{ chat: ChatData; messages: ChatMessage[] }> {
    const chatId = genId();
    const now = new Date().toISOString();
    const firstMessage = `Issue: ${issueCategory} - ${issueType}`;
    const messageId = genId();

    const chatData: ChatData = {
      chatId,
      userId,
      userName: userName || "User",
      issueCategory,
      issueType,
      status: "open",
      lastMessage: firstMessage,
      lastMessageTime: now,
      createdAt: now,
      unreadAdmin: 1,
      unreadUser: 0,
    };

    const msgData: ChatMessage = {
      messageId,
      chatId,
      sender: "user",
      message: firstMessage,
      timestamp: now,
      status: "delivered",
    };

    if (useRest()) {
      await restSetDoc("chats", chatId, chatData);
      await restSetDoc(`chats/${chatId}/messages`, messageId, msgData);
    } else {
      await setDoc(doc(db, "chats", chatId), chatData);
      await setDoc(doc(db, "chats", chatId, "messages", messageId), msgData);
    }

    return { chat: chatData, messages: [msgData] };
  },

  async getAll(): Promise<ChatData[]> {
    if (useRest()) {
      const results = await restQuery("chats", [], [{ field: "lastMessageTime", direction: "DESCENDING" }]);
      return results as ChatData[];
    }
    const q = query(collection(db, "chats"), orderBy("lastMessageTime", "desc"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ChatData);
  },

  async getByUser(userId: string): Promise<ChatData[]> {
    if (useRest()) {
      const results = await restQuery(
        "chats",
        [{ field: "userId", op: "EQUAL", value: userId }]
      );
      const chats = results as ChatData[];
      chats.sort((a, b) => (b.lastMessageTime || "").localeCompare(a.lastMessageTime || ""));
      return chats;
    }
    const q = query(collection(db, "chats"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const chats = snap.docs.map((d) => d.data() as ChatData);
    chats.sort((a, b) => (b.lastMessageTime || "").localeCompare(a.lastMessageTime || ""));
    return chats;
  },

  async getById(chatId: string): Promise<ChatData | null> {
    if (useRest()) {
      const data = await restGetDoc("chats", chatId);
      return data as ChatData | null;
    }
    const snap = await getDoc(doc(db, "chats", chatId));
    return snap.exists() ? (snap.data() as ChatData) : null;
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    if (useRest()) {
      const results = await restQuery(
        `chats/${chatId}/messages`,
        [],
        [{ field: "timestamp", direction: "ASCENDING" }]
      );
      return results as ChatMessage[];
    }
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ChatMessage);
  },

  onMessagesSnapshot(chatId: string, callback: (messages: ChatMessage[]) => void): Unsubscribe {
    if (useRest()) {
      let active = true;
      const poll = async () => {
        while (active) {
          try {
            const msgs = await Chats.getMessages(chatId);
            if (active) callback(msgs);
          } catch (e) {
            console.log("Messages polling error:", e);
            if (active) callback([]);
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      };
      poll();
      return () => { active = false; };
    }
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => d.data() as ChatMessage));
    }, (error) => {
      console.log("Messages snapshot error:", error);
      callback([]);
    });
  },

  onChatSnapshot(chatId: string, callback: (chat: ChatData | null) => void): Unsubscribe {
    if (useRest()) {
      let active = true;
      const poll = async () => {
        while (active) {
          try {
            const chat = await Chats.getById(chatId);
            if (active) callback(chat);
          } catch (e) {
            console.log("Chat snapshot polling error:", e);
            if (active) callback(null);
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      };
      poll();
      return () => { active = false; };
    }
    return onSnapshot(doc(db, "chats", chatId), (snap) => {
      callback(snap.exists() ? (snap.data() as ChatData) : null);
    }, (error) => {
      console.log("Chat snapshot error:", error);
      callback(null);
    });
  },

  onAllChatsSnapshot(callback: (chats: ChatData[]) => void): Unsubscribe {
    if (useRest()) {
      let active = true;
      const poll = async () => {
        while (active) {
          try {
            const chats = await Chats.getAll();
            if (active) callback(chats);
          } catch (e) {
            console.log("All chats polling error:", e);
            if (active) callback([]);
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      };
      poll();
      return () => { active = false; };
    }
    const q = query(collection(db, "chats"), orderBy("lastMessageTime", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => d.data() as ChatData));
    }, (error) => {
      console.log("All chats snapshot error:", error);
      callback([]);
    });
  },

  onUserChatsSnapshot(userId: string, callback: (chats: ChatData[]) => void): Unsubscribe {
    if (useRest()) {
      let active = true;
      const poll = async () => {
        while (active) {
          try {
            const chats = await Chats.getByUser(userId);
            if (active) callback(chats);
          } catch (e) {
            console.log("Chat polling error:", e);
            if (active) callback([]);
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      };
      poll();
      return () => { active = false; };
    }
    const q = query(collection(db, "chats"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
      const chats = snap.docs.map((d) => d.data() as ChatData);
      chats.sort((a, b) => (b.lastMessageTime || "").localeCompare(a.lastMessageTime || ""));
      callback(chats);
    }, (error) => {
      console.log("Chat snapshot error:", error);
      callback([]);
    });
  },

  async sendMessage(chatId: string, sender: "user" | "admin", message: string, attachment?: { imageUri?: string; fileName?: string; fileType?: string }): Promise<ChatMessage> {
    const now = new Date().toISOString();
    const messageId = genId();
    const msgData: ChatMessage = {
      messageId,
      chatId,
      sender,
      message,
      timestamp: now,
      status: "delivered",
      ...(attachment?.imageUri ? { imageUri: attachment.imageUri } : {}),
      ...(attachment?.fileName ? { fileName: attachment.fileName } : {}),
      ...(attachment?.fileType ? { fileType: attachment.fileType } : {}),
    };

    if (useRest()) {
      await restSetDoc(`chats/${chatId}/messages`, messageId, msgData);
      const chatData = await restGetDoc("chats", chatId);
      if (chatData) {
        const unreadField = sender === "user" ? "unreadAdmin" : "unreadUser";
        await restUpdateDoc("chats", chatId, {
          lastMessage: message,
          lastMessageTime: now,
          [unreadField]: (chatData[unreadField] || 0) + 1,
        });
      }
    } else {
      await setDoc(doc(db, "chats", chatId, "messages", messageId), msgData);
      const unreadField = sender === "user" ? "unreadAdmin" : "unreadUser";
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as ChatData;
        await updateDoc(chatRef, {
          lastMessage: message,
          lastMessageTime: now,
          [unreadField]: (chatData[unreadField] || 0) + 1,
        });
      }
    }

    return msgData;
  },

  async updateStatus(chatId: string, status: "open" | "resolved"): Promise<ChatData | null> {
    if (useRest()) {
      await restUpdateDoc("chats", chatId, { status });
      return restGetDoc("chats", chatId) as Promise<ChatData | null>;
    }
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { status });
    const snap = await getDoc(chatRef);
    return snap.exists() ? (snap.data() as ChatData) : null;
  },

  async markRead(chatId: string, role: "admin" | "user"): Promise<void> {
    if (useRest()) {
      if (role === "admin") {
        await restUpdateDoc("chats", chatId, { unreadAdmin: 0 });
      } else {
        await restUpdateDoc("chats", chatId, { unreadUser: 0 });
      }
      const senderFilter = role === "admin" ? "user" : "admin";
      const msgs = await restQuery(
        `chats/${chatId}/messages`,
        [{ field: "sender", op: "EQUAL", value: senderFilter }]
      );
      const writes = msgs
        .filter((m: any) => m.messageId)
        .map((m: any) => ({
          type: "update" as const,
          path: `chats/${chatId}/messages/${m.messageId}`,
          data: { status: "seen" },
          updateFields: ["status"],
        }));
      if (writes.length > 0) await restBatchWrite(writes);
      return;
    }
    const chatRef = doc(db, "chats", chatId);
    if (role === "admin") {
      await updateDoc(chatRef, { unreadAdmin: 0 });
    } else {
      await updateDoc(chatRef, { unreadUser: 0 });
    }
    const msgsQuery = query(
      collection(db, "chats", chatId, "messages"),
      where("sender", "==", role === "admin" ? "user" : "admin")
    );
    const snap = await getDocs(msgsQuery);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { status: "seen" });
    });
    await batch.commit();
  },

  async deleteChat(chatId: string): Promise<void> {
    if (useRest()) {
      const msgs = await restGetCollection(`chats/${chatId}/messages`);
      const writes: any[] = msgs
        .filter((m: any) => m.messageId)
        .map((m: any) => ({
          type: "delete",
          path: `chats/${chatId}/messages/${m.messageId}`,
        }));
      writes.push({ type: "delete", path: `chats/${chatId}` });
      await restBatchWrite(writes);
      return;
    }
    const msgsSnap = await getDocs(collection(db, "chats", chatId, "messages"));
    const batch = writeBatch(db);
    msgsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "chats", chatId));
    await batch.commit();
  },
};

export const Orders = {
  async create(data: Omit<OrderData, "id" | "created_at" | "status">): Promise<OrderData> {
    const id = genShortId("NX");
    const order: OrderData = {
      ...data,
      id,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    if (useRest()) {
      await restSetDoc("orders", id, order);
    } else {
      await setDoc(doc(db, "orders", id), order);
    }

    if (data.user_id) {
      Referrals.awardReferralReward(data.user_id, id).catch((e) => {
        console.log("Referral reward check:", e);
      });
    }

    return order;
  },

  async getAll(): Promise<OrderData[]> {
    if (useRest()) {
      const results = await restQuery("orders", [], [{ field: "created_at", direction: "DESCENDING" }]);
      return results as OrderData[];
    }
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as OrderData);
  },

  async getByUser(userId: string): Promise<OrderData[]> {
    if (useRest()) {
      const results = await restQuery(
        "orders",
        [{ field: "user_id", op: "EQUAL", value: userId }]
      );
      const orders = results as OrderData[];
      orders.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return orders;
    }
    const q = query(collection(db, "orders"), where("user_id", "==", userId));
    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => d.data() as OrderData);
    orders.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return orders;
  },

  async updateStatus(orderId: string, status: string): Promise<OrderData | null> {
    if (useRest()) {
      await restUpdateDoc("orders", orderId, { status });
      return restGetDoc("orders", orderId) as Promise<OrderData | null>;
    }
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status });
    const snap = await getDoc(orderRef);
    return snap.exists() ? (snap.data() as OrderData) : null;
  },

  async updateFields(orderId: string, fields: Partial<OrderData>): Promise<void> {
    if (useRest()) {
      await restUpdateDoc("orders", orderId, fields);
    } else {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, fields);
    }
  },
};

export const Notifications = {
  async create(data: Omit<NotificationData, "id" | "read" | "created_at">): Promise<NotificationData> {
    const id = genId();
    const notif: NotificationData = {
      ...data,
      id,
      read: false,
      created_at: new Date().toISOString(),
    };
    if (useRest()) {
      await restSetDoc("notifications", id, notif);
    } else {
      await setDoc(doc(db, "notifications", id), notif);
    }
    return notif;
  },

  async getByUser(userId: string): Promise<NotificationData[]> {
    if (useRest()) {
      const results = await restQuery(
        "notifications",
        [{ field: "user_id", op: "EQUAL", value: userId }]
      );
      const notifs = results as NotificationData[];
      notifs.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return notifs.slice(0, 20);
    }
    const q = query(collection(db, "notifications"), where("user_id", "==", userId));
    const snap = await getDocs(q);
    const notifs = snap.docs.map((d) => d.data() as NotificationData);
    notifs.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return notifs.slice(0, 20);
  },

  async markRead(notifId: string): Promise<void> {
    if (useRest()) {
      await restUpdateDoc("notifications", notifId, { read: true });
      return;
    }
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  },

  async markAllRead(userId: string): Promise<void> {
    if (useRest()) {
      const all = await restQuery(
        "notifications",
        [{ field: "user_id", op: "EQUAL", value: userId }]
      );
      const unread = all.filter((n: any) => n.read === false);
      const writes = unread
        .filter((n: any) => n.id)
        .map((n: any) => ({
          type: "update" as const,
          path: `notifications/${n.id}`,
          data: { read: true },
          updateFields: ["read"],
        }));
      if (writes.length > 0) await restBatchWrite(writes);
      return;
    }
    const q = query(collection(db, "notifications"), where("user_id", "==", userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.read === false) {
        batch.update(d.ref, { read: true });
      }
    });
    await batch.commit();
  },
};

export const OttApps = {
  async getAll(): Promise<OttApp[]> {
    if (useRest()) {
      const results = await restGetCollection("ottApps");
      if (results.length === 0) {
        const writes = DEFAULT_OTT_APPS.map((app) => ({
          type: "set" as const,
          path: `ottApps/${app.id}`,
          data: app,
        }));
        await restBatchWrite(writes);
        return [...DEFAULT_OTT_APPS];
      }
      return results as OttApp[];
    }
    const snap = await getDocs(collection(db, "ottApps"));
    if (snap.empty) {
      const batch = writeBatch(db);
      DEFAULT_OTT_APPS.forEach((app) => {
        batch.set(doc(db, "ottApps", app.id), app);
      });
      await batch.commit();
      return [...DEFAULT_OTT_APPS];
    }
    return snap.docs.map((d) => d.data() as OttApp);
  },

  async save(data: Omit<OttApp, "id" | "createdAt">): Promise<OttApp> {
    const id = genId();
    const app: OttApp = { ...data, id, createdAt: new Date().toISOString() };
    if (useRest()) {
      await restSetDoc("ottApps", id, app);
    } else {
      await setDoc(doc(db, "ottApps", id), app);
    }
    return app;
  },

  async decrementStock(id: string): Promise<number> {
    const ref = doc(db, "ottApps", id);
    return runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("App not found");
      const raw = snap.data().stockCount;
      const current = typeof raw === "number" ? raw : parseInt(String(raw ?? "0"), 10) || 0;
      if (current <= 0) throw new Error("Out of stock");
      const newCount = current - 1;
      transaction.update(ref, { stockCount: newCount, outOfStock: newCount <= 0 });
      return newCount;
    });
  },

  async update(id: string, updates: Partial<OttApp>): Promise<void> {
    if (useRest()) {
      await restUpdateDoc("ottApps", id, updates);
      return;
    }
    await updateDoc(doc(db, "ottApps", id), updates as Record<string, any>);
  },

  async remove(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("ottApps", id);
      return;
    }
    await deleteDoc(doc(db, "ottApps", id));
  },
};

export const Bookings = {
  async getAll(): Promise<Booking[]> {
    if (useRest()) {
      return restGetCollection("bookings") as Promise<Booking[]>;
    }
    const snap = await getDocs(collection(db, "bookings"));
    return snap.docs.map((d) => d.data() as Booking);
  },

  async save(data: Omit<Booking, "id" | "createdAt">): Promise<Booking> {
    const id = genId();
    const booking: Booking = { ...data, id, createdAt: new Date().toISOString() };
    if (useRest()) {
      await restSetDoc("bookings", id, booking);
    } else {
      await setDoc(doc(db, "bookings", id), booking);
    }
    return booking;
  },

  async remove(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("bookings", id);
      return;
    }
    await deleteDoc(doc(db, "bookings", id));
  },

  async clearAll(): Promise<void> {
    if (useRest()) {
      const all = await restGetCollection("bookings");
      const writes = all
        .filter((b: any) => b.id)
        .map((b: any) => ({ type: "delete" as const, path: `bookings/${b.id}` }));
      if (writes.length > 0) await restBatchWrite(writes);
      return;
    }
    const snap = await getDocs(collection(db, "bookings"));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};

export const Contacts = {
  async getAll(): Promise<ContactMessage[]> {
    if (useRest()) {
      return restGetCollection("contacts") as Promise<ContactMessage[]>;
    }
    const snap = await getDocs(collection(db, "contacts"));
    return snap.docs.map((d) => d.data() as ContactMessage);
  },

  async save(data: Omit<ContactMessage, "id" | "createdAt">): Promise<ContactMessage> {
    const id = genId();
    const msg: ContactMessage = { ...data, id, createdAt: new Date().toISOString() };
    if (useRest()) {
      await restSetDoc("contacts", id, msg);
    } else {
      await setDoc(doc(db, "contacts", id), msg);
    }
    return msg;
  },

  async remove(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("contacts", id);
      return;
    }
    await deleteDoc(doc(db, "contacts", id));
  },

  async clearAll(): Promise<void> {
    if (useRest()) {
      const all = await restGetCollection("contacts");
      const writes = all
        .filter((c: any) => c.id)
        .map((c: any) => ({ type: "delete" as const, path: `contacts/${c.id}` }));
      if (writes.length > 0) await restBatchWrite(writes);
      return;
    }
    const snap = await getDocs(collection(db, "contacts"));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};

export const SubRequests = {
  async getAll(): Promise<SubRequest[]> {
    if (useRest()) {
      return restGetCollection("subRequests") as Promise<SubRequest[]>;
    }
    const snap = await getDocs(collection(db, "subRequests"));
    return snap.docs.map((d) => d.data() as SubRequest);
  },

  async save(data: Omit<SubRequest, "id" | "createdAt">): Promise<SubRequest> {
    const id = genId();
    const req: SubRequest = { ...data, id, createdAt: new Date().toISOString() };
    if (useRest()) {
      await restSetDoc("subRequests", id, req);
    } else {
      await setDoc(doc(db, "subRequests", id), req);
    }
    return req;
  },

  async remove(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("subRequests", id);
      return;
    }
    await deleteDoc(doc(db, "subRequests", id));
  },

  async clearAll(): Promise<void> {
    if (useRest()) {
      const all = await restGetCollection("subRequests");
      const writes = all
        .filter((s: any) => s.id)
        .map((s: any) => ({ type: "delete" as const, path: `subRequests/${s.id}` }));
      if (writes.length > 0) await restBatchWrite(writes);
      return;
    }
    const snap = await getDocs(collection(db, "subRequests"));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};

export const Users = {
  async getAll(): Promise<UserProfile[]> {
    if (useRest()) {
      return restGetCollection("users") as Promise<UserProfile[]>;
    }
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => d.data() as UserProfile);
  },

  async getById(id: string): Promise<UserProfile | null> {
    if (useRest()) {
      return restGetDoc("users", id) as Promise<UserProfile | null>;
    }
    const snap = await getDoc(doc(db, "users", id));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  },

  async getByEmail(email: string): Promise<UserProfile | null> {
    if (useRest()) {
      const results = await restQuery(
        "users",
        [{ field: "email", op: "EQUAL", value: email.toLowerCase() }]
      );
      return results.length > 0 ? (results[0] as UserProfile) : null;
    }
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as UserProfile);
  },

  async getByPhone(phone: string): Promise<UserProfile | null> {
    if (!phone) return null;
    if (useRest()) {
      const results = await restQuery(
        "users",
        [{ field: "phone", op: "EQUAL", value: phone }]
      );
      return results.length > 0 ? (results[0] as UserProfile) : null;
    }
    const q = query(collection(db, "users"), where("phone", "==", phone));
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as UserProfile);
  },

  async save(id: string, data: Omit<UserProfile, "id">): Promise<UserProfile> {
    const profile: UserProfile = { ...data, id };
    if (useRest()) {
      await restSetDoc("users", id, profile);
    } else {
      await setDoc(doc(db, "users", id), profile);
    }
    return profile;
  },

  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (useRest()) {
      await restUpdateDoc("users", id, updates);
      return Users.getById(id);
    }
    await updateDoc(doc(db, "users", id), updates as Record<string, any>);
    return Users.getById(id);
  },

  async remove(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("users", id);
      return;
    }
    await deleteDoc(doc(db, "users", id));
  },

  async generateUniqueId(): Promise<string> {
    const counterRef = doc(db, "counters", "userCounter");
    if (useRest()) {
      const counterData = await restGetDoc("counters", "userCounter");
      const lastNumber = (counterData?.lastNumber || 0) as number;
      const newNumber = lastNumber + 1;
      await restSetDoc("counters", "userCounter", { lastNumber: newNumber });
      return `DZ${String(newNumber).padStart(2, "0")}`;
    }
    const result = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const lastNumber = counterSnap.exists() ? (counterSnap.data().lastNumber || 0) : 0;
      const newNumber = lastNumber + 1;
      transaction.set(counterRef, { lastNumber: newNumber });
      return `DZ${String(newNumber).padStart(2, "0")}`;
    });
    return result;
  },

  async getBySponsorId(sponsorId: string): Promise<UserProfile[]> {
    if (!sponsorId) return [];
    const altId = sponsorId.startsWith("DE") ? "DZ" + sponsorId.slice(2)
      : sponsorId.startsWith("DZ") ? "DE" + sponsorId.slice(2) : null;
    if (useRest()) {
      const results = await restQuery("users", [{ field: "sponsorId", op: "EQUAL", value: sponsorId }]) as UserProfile[];
      if (altId) {
        const altResults = await restQuery("users", [{ field: "sponsorId", op: "EQUAL", value: altId }]) as UserProfile[];
        const ids = new Set(results.map((r) => r.id));
        for (const r of altResults) { if (!ids.has(r.id)) results.push(r); }
      }
      return results;
    }
    const q = query(collection(db, "users"), where("sponsorId", "==", sponsorId));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as UserProfile);
    if (altId) {
      const q2 = query(collection(db, "users"), where("sponsorId", "==", altId));
      const snap2 = await getDocs(q2);
      const ids = new Set(results.map((r) => r.id));
      for (const d of snap2.docs) { const u = d.data() as UserProfile; if (!ids.has(u.id)) results.push(u); }
    }
    return results;
  },

  async getByUniqueId(uniqueId: string): Promise<UserProfile | null> {
    if (!uniqueId) return null;
    const upper = uniqueId.toUpperCase().trim();
    if (useRest()) {
      let results = await restQuery("users", [{ field: "uniqueId", op: "EQUAL", value: upper }]);
      if (results.length === 0 && upper.startsWith("DE")) {
        results = await restQuery("users", [{ field: "uniqueId", op: "EQUAL", value: "DZ" + upper.slice(2) }]);
      } else if (results.length === 0 && upper.startsWith("DZ")) {
        results = await restQuery("users", [{ field: "uniqueId", op: "EQUAL", value: "DE" + upper.slice(2) }]);
      }
      return results.length > 0 ? (results[0] as UserProfile) : null;
    }
    let q = query(collection(db, "users"), where("uniqueId", "==", upper));
    let snap = await getDocs(q);
    if (snap.empty && upper.startsWith("DE")) {
      q = query(collection(db, "users"), where("uniqueId", "==", "DZ" + upper.slice(2)));
      snap = await getDocs(q);
    } else if (snap.empty && upper.startsWith("DZ")) {
      q = query(collection(db, "users"), where("uniqueId", "==", "DE" + upper.slice(2)));
      snap = await getDocs(q);
    }
    return snap.empty ? null : (snap.docs[0].data() as UserProfile);
  },
};

export interface NetworkMember {
  id: string;
  ownerId: string;
  ownerUniqueId: string;
  memberId: string;
  memberUniqueId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  addedAt: string;
}

export const MyNetwork = {
  async addMember(ownerId: string, ownerUniqueId: string, memberUniqueId: string): Promise<{ success: boolean; message: string }> {
    if (!memberUniqueId) return { success: false, message: "Please enter a valid Sponsor ID" };
    const upper = memberUniqueId.toUpperCase().trim();
    if (upper === ownerUniqueId) return { success: false, message: "You cannot add yourself" };

    const member = await Users.getByUniqueId(upper);
    if (!member) return { success: false, message: "No user found with this ID" };

    const existing = await MyNetwork.getMembers(ownerId);
    if (existing.some((m) => m.memberUniqueId === upper)) {
      return { success: false, message: "This member is already in your network" };
    }

    const docId = genId();
    const data: NetworkMember = {
      id: docId,
      ownerId,
      ownerUniqueId,
      memberId: member.id,
      memberUniqueId: member.uniqueId || upper,
      memberName: member.name,
      memberEmail: member.email,
      memberPhone: member.phone,
      addedAt: new Date().toISOString(),
    };

    if (useRest()) {
      await restSetDoc("myNetwork", docId, data);
    } else {
      await setDoc(doc(db, "myNetwork", docId), data);
    }
    return { success: true, message: `${member.name} added to your network` };
  },

  async getMembers(ownerId: string): Promise<NetworkMember[]> {
    if (useRest()) {
      return restQuery("myNetwork", [{ field: "ownerId", op: "EQUAL", value: ownerId }]) as Promise<NetworkMember[]>;
    }
    const q = query(collection(db, "myNetwork"), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as NetworkMember);
  },

  async removeMember(docId: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("myNetwork", docId);
    } else {
      await deleteDoc(doc(db, "myNetwork", docId));
    }
  },
};

export const Settings = {
  async getWhatsAppNumber(): Promise<string> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general");
      return data?.whatsappNumber || "";
    }
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      return snap.data().whatsappNumber || "";
    }
    return "";
  },

  async setWhatsAppNumber(number: string): Promise<void> {
    if (useRest()) {
      await restSetDoc("settings", "general", { whatsappNumber: number.trim() });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { whatsappNumber: number.trim() }, { merge: true });
  },

  async getReferralRewardCoins(): Promise<number> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general");
      return data?.referralRewardCoins ?? 500;
    }
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      return snap.data().referralRewardCoins ?? 500;
    }
    return 500;
  },

  async setReferralRewardCoins(coins: number): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, referralRewardCoins: coins });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { referralRewardCoins: coins }, { merge: true });
  },

  async getWithdrawalTaxPercent(): Promise<number> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general");
      return data?.withdrawalTaxPercent ?? 18;
    }
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      return snap.data().withdrawalTaxPercent ?? 18;
    }
    return 18;
  },

  async setWithdrawalTaxPercent(percent: number): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, withdrawalTaxPercent: percent });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { withdrawalTaxPercent: percent }, { merge: true });
  },

  async getUpiSettings(): Promise<{ upiId: string; upiName: string }> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general");
      return { upiId: data?.upiId || "shekhar9267@ibl", upiName: data?.upiName || "Shekhar Cricket Club" };
    }
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      const data = snap.data();
      return { upiId: data.upiId || "shekhar9267@ibl", upiName: data.upiName || "Shekhar Cricket Club" };
    }
    return { upiId: "shekhar9267@ibl", upiName: "Shekhar Cricket Club" };
  },

  async setUpiSettings(upiId: string, upiName: string): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, upiId: upiId.trim(), upiName: upiName.trim() });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { upiId: upiId.trim(), upiName: upiName.trim() }, { merge: true });
  },

  async getCostPercent(): Promise<number> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general");
      return data?.costPercent ?? 30;
    }
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      return snap.data().costPercent ?? 30;
    }
    return 30;
  },

  async setCostPercent(percent: number): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, costPercent: percent });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { costPercent: percent }, { merge: true });
  },

  async getMetaAdsPricing(): Promise<{
    oneTime: number; weekly: number; fifteenDays: number; monthly: number;
    origOneTime: number; origWeekly: number; origFifteenDays: number; origMonthly: number;
  }> {
    const defaults = {
      oneTime: 349, weekly: 499, fifteenDays: 849, monthly: 1499,
      origOneTime: 500, origWeekly: 699, origFifteenDays: 1399, origMonthly: 2999,
    };
    try {
      let p: any = null;
      if (useRest()) {
        const data = await restGetDoc("settings", "general");
        p = data?.metaAdsPricing;
      } else {
        const snap = await getDoc(doc(db, "settings", "general"));
        if (snap.exists()) p = snap.data().metaAdsPricing;
      }
      if (p) return {
        oneTime: p.oneTime ?? defaults.oneTime,
        weekly: p.weekly ?? defaults.weekly,
        fifteenDays: p.fifteenDays ?? defaults.fifteenDays,
        monthly: p.monthly ?? defaults.monthly,
        origOneTime: p.origOneTime ?? defaults.origOneTime,
        origWeekly: p.origWeekly ?? defaults.origWeekly,
        origFifteenDays: p.origFifteenDays ?? defaults.origFifteenDays,
        origMonthly: p.origMonthly ?? defaults.origMonthly,
      };
    } catch {}
    return defaults;
  },

  async setMetaAdsPricing(pricing: {
    oneTime: number; weekly: number; fifteenDays: number; monthly: number;
    origOneTime: number; origWeekly: number; origFifteenDays: number; origMonthly: number;
  }): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, metaAdsPricing: pricing });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { metaAdsPricing: pricing }, { merge: true });
  },

  async getBusinessOwnerPricing(): Promise<{ setupManage: number; oneTime: number }> {
    const defaults = { setupManage: 499, oneTime: 349 };
    try {
      let p: any = null;
      if (useRest()) {
        const data = await restGetDoc("settings", "general");
        p = data?.businessOwnerPricing;
      } else {
        const snap = await getDoc(doc(db, "settings", "general"));
        if (snap.exists()) p = snap.data().businessOwnerPricing;
      }
      if (p) return {
        setupManage: p.setupManage ?? defaults.setupManage,
        oneTime: p.oneTime ?? defaults.oneTime,
      };
    } catch {}
    return defaults;
  },

  async setBusinessOwnerPricing(pricing: { setupManage: number; oneTime: number }): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, businessOwnerPricing: pricing });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { businessOwnerPricing: pricing }, { merge: true });
  },

  async getMetaAdsStock(): Promise<{
    oneTime: number; weekly: number; fifteenDays: number; monthly: number;
    boSetupManage: number; boOneTime: number;
  }> {
    const defaults = { oneTime: 0, weekly: 0, fifteenDays: 0, monthly: 0, boSetupManage: 0, boOneTime: 0 };
    try {
      let s: any = null;
      if (useRest()) {
        const data = await restGetDoc("settings", "general");
        s = data?.metaAdsStock;
      } else {
        const snap = await getDoc(doc(db, "settings", "general"));
        if (snap.exists()) s = snap.data().metaAdsStock;
      }
      if (s) return {
        oneTime: s.oneTime ?? defaults.oneTime,
        weekly: s.weekly ?? defaults.weekly,
        fifteenDays: s.fifteenDays ?? defaults.fifteenDays,
        monthly: s.monthly ?? defaults.monthly,
        boSetupManage: s.boSetupManage ?? defaults.boSetupManage,
        boOneTime: s.boOneTime ?? defaults.boOneTime,
      };
    } catch {}
    return defaults;
  },

  async setMetaAdsStock(stock: {
    oneTime: number; weekly: number; fifteenDays: number; monthly: number;
    boSetupManage: number; boOneTime: number;
  }): Promise<void> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      await restSetDoc("settings", "general", { ...data, metaAdsStock: stock });
      return;
    }
    await setDoc(doc(db, "settings", "general"), { metaAdsStock: stock }, { merge: true });
  },

  async decrementMetaAdsStock(planKey: string): Promise<number> {
    if (useRest()) {
      const data = await restGetDoc("settings", "general") || {};
      const stock = data?.metaAdsStock || {};
      const current = stock[planKey] ?? 0;
      if (current <= 0) return -1;
      const newCount = current - 1;
      stock[planKey] = newCount;
      await restSetDoc("settings", "general", { ...data, metaAdsStock: stock });
      return newCount;
    }
    const ref = doc(db, "settings", "general");
    return runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.exists() ? snap.data() : {};
      const stock = data.metaAdsStock || {};
      const current = stock[planKey] ?? 0;
      if (current <= 0) return -1;
      const newCount = current - 1;
      transaction.update(ref, { [`metaAdsStock.${planKey}`]: newCount });
      return newCount;
    });
  },
};

export const Wallet = {
  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    if (useRest()) {
      const results = await restQuery(
        "walletTransactions",
        [{ field: "userId", op: "EQUAL", value: userId }]
      );
      const txns = results as WalletTransaction[];
      txns.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return txns;
    }
    const q = query(collection(db, "walletTransactions"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const txns = snap.docs.map((d) => d.data() as WalletTransaction);
    txns.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return txns;
  },

  async addTransaction(txn: Omit<WalletTransaction, "id">): Promise<WalletTransaction> {
    const id = genId();
    const transaction: WalletTransaction = { ...txn, id };
    if (useRest()) {
      await restSetDoc("walletTransactions", id, transaction);
    } else {
      await setDoc(doc(db, "walletTransactions", id), transaction);
    }
    return transaction;
  },

  async addCoins(userId: string, coins: number): Promise<void> {
    const user = await Users.getById(userId);
    if (!user) return;
    const currentCoins = user.walletCoins || 0;
    await Users.update(userId, { walletCoins: currentCoins + coins });
  },

  async getBalance(userId: string): Promise<number> {
    const user = await Users.getById(userId);
    return user?.walletCoins || 0;
  },

  async getRupeeBalance(userId: string): Promise<number> {
    const user = await Users.getById(userId);
    return user?.walletBalance || 0;
  },

  async addRupees(userId: string, amount: number): Promise<void> {
    const user = await Users.getById(userId);
    if (!user) return;
    const currentBalance = user.walletBalance || 0;
    await Users.update(userId, { walletBalance: currentBalance + amount });
  },

  async redeemCoins(userId: string, coins: number): Promise<{ success: boolean; message: string }> {
    if (coins < 100) return { success: false, message: "Minimum 100 coins required to redeem" };
    if (coins % 100 !== 0) return { success: false, message: "Coins must be in multiples of 100" };

    const user = await Users.getById(userId);
    if (!user) return { success: false, message: "User not found" };

    const currentCoins = user.walletCoins || 0;
    if (currentCoins < coins) return { success: false, message: "Insufficient coins" };

    const rupees = (coins / 100) * 10;
    const currentBalance = user.walletBalance || 0;

    await Users.update(userId, {
      walletCoins: currentCoins - coins,
      walletBalance: currentBalance + rupees,
    });

    await Wallet.addTransaction({
      userId,
      type: "redemption",
      coins: -coins,
      amountRupees: rupees,
      description: `Redeemed ${coins} coins for \u20B9${rupees}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, message: `Successfully redeemed ${coins} coins for \u20B9${rupees}` };
  },
};

export const Earnings = {
  async create(data: Omit<EarningRecord, "id">): Promise<EarningRecord> {
    const id = genId();
    const record: EarningRecord = { ...data, id };
    if (useRest()) {
      await restSetDoc("earnings", id, record);
    } else {
      await setDoc(doc(db, "earnings", id), record);
    }
    return record;
  },

  async getByUser(userId: string): Promise<EarningRecord[]> {
    if (useRest()) {
      const results = await restQuery(
        "earnings",
        [{ field: "userId", op: "EQUAL", value: userId }]
      );
      const records = results as EarningRecord[];
      records.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return records;
    }
    const q = query(collection(db, "earnings"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => d.data() as EarningRecord);
    records.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return records;
  },

  async awardJoiningBonus(userId: string, userName?: string): Promise<void> {
    const amount = 20;
    await Wallet.addRupees(userId, amount);
    await Wallet.addTransaction({
      userId,
      type: "joining_bonus",
      coins: 0,
      amountRupees: amount,
      description: "Joining Bonus",
      createdAt: new Date().toISOString(),
    });
    await Earnings.create({
      userId,
      fromUserId: "",
      fromUserName: "",
      level: 0,
      amount,
      type: "joining_bonus",
      createdAt: new Date().toISOString(),
    });
  },

  async awardReferralSignupBonus(sponsorId: string, newUserId: string, newUserName: string): Promise<void> {
    const amount = 10;
    await Wallet.addRupees(sponsorId, amount);
    await Wallet.addTransaction({
      userId: sponsorId,
      type: "referral_signup_bonus",
      coins: 0,
      amountRupees: amount,
      description: `Referral bonus \u2013 ${newUserName} joined`,
      sourceUserId: newUserId,
      createdAt: new Date().toISOString(),
    });
    await Earnings.create({
      userId: sponsorId,
      fromUserId: newUserId,
      fromUserName: newUserName,
      level: 0,
      amount,
      type: "referral_signup_bonus",
      createdAt: new Date().toISOString(),
    });
  },

  async distributeCommissions(buyerUserId: string, orderId: string, purchaseAmount: number): Promise<void> {
    const commissionRates = [0.05, 0.025, 0.01];
    let currentUserId = buyerUserId;

    const buyer = await Users.getById(buyerUserId);
    const buyerName = buyer?.name || "A user";

    for (let level = 0; level < 3; level++) {
      const currentUser = await Users.getById(currentUserId);
      if (!currentUser?.sponsorId) break;

      const sponsor = await Users.getByUniqueId(currentUser.sponsorId);
      if (!sponsor || sponsor.id === buyerUserId) {
        currentUserId = sponsor?.id || "";
        continue;
      }

      const commission = Math.round(purchaseAmount * commissionRates[level] * 100) / 100;
      if (commission <= 0) {
        currentUserId = sponsor.id;
        continue;
      }

      await Wallet.addRupees(sponsor.id, commission);
      await Wallet.addTransaction({
        userId: sponsor.id,
        type: "level_commission",
        coins: 0,
        amountRupees: commission,
        description: `L${level + 1} commission from ${buyerName}'s purchase`,
        sourceUserId: buyerUserId,
        orderId,
        createdAt: new Date().toISOString(),
      });
      await Earnings.create({
        userId: sponsor.id,
        fromUserId: buyerUserId,
        fromUserName: buyerName,
        level: level + 1,
        amount: commission,
        orderId,
        type: "level_commission",
        createdAt: new Date().toISOString(),
      });

      currentUserId = sponsor.id;
    }
  },
};

export const Referrals = {
  generateCode(userId: string): string {
    const base = userId.substring(0, 4).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NEX${base}${rand}`;
  },

  async getByCode(code: string): Promise<UserProfile | null> {
    if (!code) return null;
    const upperCode = code.toUpperCase().trim();
    if (useRest()) {
      const results = await restQuery(
        "users",
        [{ field: "referralCode", op: "EQUAL", value: upperCode }]
      );
      return results.length > 0 ? (results[0] as UserProfile) : null;
    }
    const q = query(collection(db, "users"), where("referralCode", "==", upperCode));
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as UserProfile);
  },

  async hasBeenRewarded(referredUserId: string): Promise<boolean> {
    if (useRest()) {
      const results = await restQuery(
        "referralRewards",
        [{ field: "referredUserId", op: "EQUAL", value: referredUserId }]
      );
      return results.length > 0;
    }
    const q = query(collection(db, "referralRewards"), where("referredUserId", "==", referredUserId));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  async awardReferralReward(referredUserId: string, orderId: string): Promise<boolean> {
    const referredUser = await Users.getById(referredUserId);
    if (!referredUser || !referredUser.referredBy) return false;

    const alreadyRewarded = await Referrals.hasBeenRewarded(referredUserId);
    if (alreadyRewarded) return false;

    const referrer = await Users.getById(referredUser.referredBy);
    if (!referrer) return false;

    const rewardCoins = await Settings.getReferralRewardCoins();

    await Wallet.addCoins(referrer.id, rewardCoins);

    await Wallet.addTransaction({
      userId: referrer.id,
      type: "referral_reward",
      coins: rewardCoins,
      description: `Referral reward from ${referredUser.name || "a user"}`,
      sourceUserId: referredUserId,
      orderId,
      createdAt: new Date().toISOString(),
    });

    const rewardId = genId();
    const reward: ReferralReward = {
      id: rewardId,
      referrerId: referrer.id,
      referredUserId,
      orderId,
      coins: rewardCoins,
      createdAt: new Date().toISOString(),
    };
    if (useRest()) {
      await restSetDoc("referralRewards", rewardId, reward);
    } else {
      await setDoc(doc(db, "referralRewards", rewardId), reward);
    }

    return true;
  },

  async getReferralStats(): Promise<{ totalReferrals: number; totalCoinsAwarded: number; rewards: ReferralReward[] }> {
    let rewards: ReferralReward[];
    if (useRest()) {
      rewards = (await restGetCollection("referralRewards")) as ReferralReward[];
    } else {
      const snap = await getDocs(collection(db, "referralRewards"));
      rewards = snap.docs.map((d) => d.data() as ReferralReward);
    }
    const totalCoinsAwarded = rewards.reduce((sum, r) => sum + (r.coins || 0), 0);
    return { totalReferrals: rewards.length, totalCoinsAwarded, rewards };
  },
};

export const Withdrawals = {
  async create(data: Omit<WithdrawalRequest, "id" | "createdAt" | "updatedAt">): Promise<WithdrawalRequest> {
    const id = genId();
    const withdrawal: WithdrawalRequest = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    if (useRest()) {
      await restSetDoc("withdrawals", id, withdrawal);
    } else {
      await setDoc(doc(db, "withdrawals", id), withdrawal);
    }
    return withdrawal;
  },

  async getAll(): Promise<WithdrawalRequest[]> {
    if (useRest()) {
      const results = await restQuery("withdrawals", [], [{ field: "createdAt", direction: "DESCENDING" }]);
      return results as WithdrawalRequest[];
    }
    const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WithdrawalRequest);
  },

  async getByUser(userId: string): Promise<WithdrawalRequest[]> {
    if (useRest()) {
      const results = await restQuery(
        "withdrawals",
        [{ field: "userId", op: "EQUAL", value: userId }]
      );
      const w = results as WithdrawalRequest[];
      w.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return w;
    }
    const q = query(collection(db, "withdrawals"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const w = snap.docs.map((d) => d.data() as WithdrawalRequest);
    w.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return w;
  },

  async hasPendingWithdrawal(userId: string): Promise<boolean> {
    if (useRest()) {
      const results = await restQuery(
        "withdrawals",
        [
          { field: "userId", op: "EQUAL", value: userId },
          { field: "status", op: "EQUAL", value: "pending" },
        ]
      );
      return results.length > 0;
    }
    const q = query(
      collection(db, "withdrawals"),
      where("userId", "==", userId),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  async updateStatus(id: string, status: "approved" | "failed"): Promise<WithdrawalRequest | null> {
    const now = new Date().toISOString();
    if (useRest()) {
      await restUpdateDoc("withdrawals", id, { status, updatedAt: now });
      return restGetDoc("withdrawals", id) as Promise<WithdrawalRequest | null>;
    }
    const ref = doc(db, "withdrawals", id);
    await updateDoc(ref, { status, updatedAt: now });
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as WithdrawalRequest) : null;
  },

  async refund(withdrawal: WithdrawalRequest): Promise<void> {
    await Wallet.addRupees(withdrawal.userId, withdrawal.amount);
    await Wallet.addTransaction({
      userId: withdrawal.userId,
      type: "withdrawal_refund",
      coins: 0,
      amountRupees: withdrawal.amount,
      description: `Withdrawal refund - \u20B9${withdrawal.amount}`,
      createdAt: new Date().toISOString(),
    });
  },
};

export interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
}

export const Expenses = {
  async create(data: Omit<ExpenseData, "id">): Promise<ExpenseData> {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const expense: ExpenseData = { id, ...data };
    if (useRest()) {
      await restSetDoc("expenses", id, expense);
    } else {
      await setDoc(doc(db, "expenses", id), expense);
    }
    return expense;
  },

  async getAll(): Promise<ExpenseData[]> {
    if (useRest()) {
      const results = await restQuery("expenses", [], [{ field: "createdAt", direction: "DESCENDING" }]);
      return results as ExpenseData[];
    }
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ExpenseData);
  },

  async delete(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("expenses", id);
      return;
    }
    await deleteDoc(doc(db, "expenses", id));
  },

  async update(id: string, data: Partial<ExpenseData>): Promise<void> {
    if (useRest()) {
      await restUpdateDoc("expenses", id, data);
      return;
    }
    await updateDoc(doc(db, "expenses", id), data);
  },
};

export const PushTokens = {
  async save(userId: string, token: string, platform: string): Promise<void> {
    if (useRest()) {
      await restSetDoc("pushTokens", token, { userId, token, platform });
      return;
    }
    await setDoc(doc(db, "pushTokens", token), { userId, token, platform });
  },

  async remove(token: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("pushTokens", token);
      return;
    }
    await deleteDoc(doc(db, "pushTokens", token));
  },

  async getByUser(userId: string): Promise<string[]> {
    if (useRest()) {
      const results = await restQuery(
        "pushTokens",
        [{ field: "userId", op: "EQUAL", value: userId }]
      );
      return results.map((d: any) => d.token);
    }
    const q = query(collection(db, "pushTokens"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().token);
  },
};

export const WalletOrders = {
  async create(data: Omit<WalletOrder, "id">): Promise<WalletOrder> {
    const id = genId();
    const order: WalletOrder = { ...data, id };
    if (useRest()) {
      await restSetDoc("walletOrders", id, order);
    } else {
      await setDoc(doc(db, "walletOrders", id), order);
    }
    return order;
  },

  async getById(id: string): Promise<WalletOrder | null> {
    if (useRest()) {
      const result = await restGetDoc("walletOrders", id);
      return result ? (result as WalletOrder) : null;
    }
    const snap = await getDoc(doc(db, "walletOrders", id));
    return snap.exists() ? (snap.data() as WalletOrder) : null;
  },

  async getAll(): Promise<WalletOrder[]> {
    if (useRest()) {
      const results = await restQuery("walletOrders", []);
      const orders = results as WalletOrder[];
      orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return orders;
    }
    const snap = await getDocs(collection(db, "walletOrders"));
    const orders = snap.docs.map((d) => d.data() as WalletOrder);
    orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return orders;
  },

  async getByUser(userId: string): Promise<WalletOrder[]> {
    if (useRest()) {
      const results = await restQuery(
        "walletOrders",
        [{ field: "userId", op: "EQUAL", value: userId }]
      );
      const orders = results as WalletOrder[];
      orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return orders;
    }
    const q = query(collection(db, "walletOrders"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => d.data() as WalletOrder);
    orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return orders;
  },

  async updateStatus(id: string, status: WalletOrder["status"]): Promise<void> {
    if (useRest()) {
      await restUpdateDoc("walletOrders", id, { status });
    } else {
      await setDoc(doc(db, "walletOrders", id), { status }, { merge: true });
    }
  },

  async updateUtr(id: string, utr: string): Promise<void> {
    const updates = { utr, status: "verification_pending" as const };
    if (useRest()) {
      await restUpdateDoc("walletOrders", id, updates);
    } else {
      await setDoc(doc(db, "walletOrders", id), updates, { merge: true });
    }
  },

  async delete(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("walletOrders", id);
    } else {
      await deleteDoc(doc(db, "walletOrders", id));
    }
  },
};

export interface BusinessOwnerData {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  contactNumber: string;
  email: string;
  location: string;
  website: string;
  socialLinks: string;
  businessType: string;
  industry: string;
  yearsInBusiness: string;
  sellMode: string;
  usp: string;
  targetAgeRange: string;
  targetGender: string;
  targetLocation: string;
  audienceType: string;
  problemSolved: string;
  ranAdsBefore: boolean;
  platformsUsed: string[];
  monthlyAdBudget: string;
  adGoal: string;
  creativesReady: boolean;
  averagePrice: string;
  profitMargin: string;
  currentMonthlySales: string;
  paymentGatewaySetup: boolean;
  createdAt: string;
}

export const BusinessOwners = {
  async create(data: Omit<BusinessOwnerData, "id" | "createdAt">): Promise<BusinessOwnerData> {
    const id = genId();
    const entry: BusinessOwnerData = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    if (useRest()) {
      await restSetDoc("businessOwners", id, entry);
    } else {
      await setDoc(doc(db, "businessOwners", id), entry);
    }
    return entry;
  },

  async getAll(): Promise<BusinessOwnerData[]> {
    if (useRest()) {
      const results = await restQuery("businessOwners", []);
      return results as BusinessOwnerData[];
    }
    const snap = await getDocs(collection(db, "businessOwners"));
    return snap.docs.map((d) => d.data() as BusinessOwnerData);
  },

  async delete(id: string): Promise<void> {
    if (useRest()) {
      await restDeleteDoc("businessOwners", id);
      return;
    }
    await deleteDoc(doc(db, "businessOwners", id));
  },

  async getByUser(userId: string): Promise<BusinessOwnerData[]> {
    if (useRest()) {
      const results = await restQuery("businessOwners", [{ field: "userId", op: "EQUAL", value: userId }]);
      return results as BusinessOwnerData[];
    }
    const q = query(collection(db, "businessOwners"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BusinessOwnerData);
  },
};
