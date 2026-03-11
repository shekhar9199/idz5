import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
  BackHandler,
  ScrollView,
  Image,
  Alert,
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Animated, {
  FadeInDown,
} from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { Chats, Settings } from "@/lib/firestore";

interface ChatMsg {
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

interface ChatData {
  chatId: string;
  userId: string;
  userName: string;
  issueCategory: string;
  issueType: string;
  status: "open" | "resolved";
  lastMessage: string;
  lastMessageTime: string;
  createdAt: string;
  unreadUser: number;
}

const QUICK_ISSUES = [
  { label: "Leads problem", icon: "megaphone-outline" as const, color: "#0D9488" },
  { label: "Ads account banned", icon: "ban-outline" as const, color: "#EF4444" },
  { label: "Lead cost too high", icon: "trending-up-outline" as const, color: "#F59E0B" },
  { label: "Campaign not spending", icon: "pause-circle-outline" as const, color: "#8B5CF6" },
  { label: "Subscription not activated", icon: "diamond-outline" as const, color: "#F97316" },
  { label: "Payment issue", icon: "card-outline" as const, color: "#EC4899" },
  { label: "App login issue", icon: "log-in-outline" as const, color: "#6366F1" },
  { label: "Withdrawal query", icon: "arrow-up-circle-outline" as const, color: "#14B8A6" },
  { label: "Other issue", icon: "help-circle-outline" as const, color: "#64748B" },
];

function MessageBubble({ msg, colors, isDark, onImagePress }: { msg: ChatMsg; colors: any; isDark: boolean; onImagePress?: (uri: string) => void }) {
  const isUser = msg.sender === "user";
  const time = new Date(msg.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleLongPress() {
    const textToCopy = msg.message || msg.fileName || "";
    if (!textToCopy) return;
    Clipboard.setStringAsync(textToCopy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied", "Message copied to clipboard");
  }

  return (
    <View style={[bubbleStyles.row, isUser ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
      {!isUser && (
        <View style={[bubbleStyles.avatar, { backgroundColor: colors.tint }]}>
          <Ionicons name="headset-outline" size={14} color="#FFF" />
        </View>
      )}
      <View style={{ maxWidth: "75%" }}>
        {!isUser && (
          <View style={bubbleStyles.adminTag}>
            <Ionicons name="shield-checkmark" size={10} color="#0D9488" />
            <Text style={bubbleStyles.adminTagText}>Admin</Text>
          </View>
        )}
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={400}
          style={[
            bubbleStyles.bubble,
            isUser
              ? { backgroundColor: colors.tint, borderBottomRightRadius: 4 }
              : {
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                  borderBottomLeftRadius: 4,
                },
          ]}
        >
          {msg.imageUri && (
            <Pressable onPress={() => onImagePress?.(msg.imageUri!)}>
              <Image
                source={{ uri: msg.imageUri }}
                style={bubbleStyles.image}
                resizeMode="cover"
              />
            </Pressable>
          )}
          {msg.fileName && !msg.imageUri && (
            <View style={bubbleStyles.fileRow}>
              <Ionicons name="document-outline" size={18} color={isUser ? "#FFF" : colors.tint} />
              <Text
                style={[bubbleStyles.fileName, { color: isUser ? "#FFF" : colors.text }]}
                numberOfLines={1}
              >
                {msg.fileName}
              </Text>
            </View>
          )}
          {msg.message ? (
            <Text
              style={[
                bubbleStyles.text,
                { color: isUser ? "#FFF" : colors.text },
              ]}
            >
              {msg.message}
            </Text>
          ) : null}
          <View style={bubbleStyles.meta}>
            <Text
              style={[
                bubbleStyles.time,
                { color: isUser ? "rgba(255,255,255,0.7)" : colors.textSecondary },
              ]}
            >
              {time}
            </Text>
            {isUser && (
              <Ionicons
                name={msg.status === "seen" ? "checkmark-done" : "checkmark-done-outline"}
                size={14}
                color={msg.status === "seen" ? "#A7F3D0" : "rgba(255,255,255,0.5)"}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 3, paddingHorizontal: 12, alignItems: "flex-end" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  adminTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
    marginLeft: 4,
  },
  adminTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#0D9488",
    letterSpacing: 0.3,
  },
  text: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
    marginHorizontal: -4,
    marginTop: -2,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});


export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ orderChat?: string; orderId?: string; orderService?: string; orderPlan?: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [phase, setPhase] = useState<"chat" | "history">("history");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userChats, setUserChats] = useState<ChatData[]>([]);
  const [isOnline] = useState(true);
  const [isNewChat, setIsNewChat] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "chat") {
        setChatId(null);
        setMessages([]);
        setIsNewChat(false);
        setPhase("history");
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [phase]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = Chats.onUserChatsSnapshot(user.id, (data) => {
      setUserChats(data);
      setLoading(false);
    });
    Settings.getWhatsAppNumber().then(setWhatsappNumber).catch(() => {});
    return () => unsub();
  }, [user]);

  const orderChatHandled = useRef(false);
  useEffect(() => {
    if (params.orderChat === "true" && params.orderService && user && !chatId && !loading && !orderChatHandled.current) {
      orderChatHandled.current = true;
      const category = params.orderService.includes("Meta") ? "Meta Ads Problems" : "Premium App Subscription";
      const issueType = `Order #${params.orderId} - ${params.orderPlan}`;
      const existingChat = userChats.find(
        (c) => c.issueType === issueType && c.status === "open"
      );
      if (existingChat) {
        openExistingChat(existingChat);
      } else {
        startChat(category, issueType);
      }
    }
  }, [params.orderChat, params.orderId, user, loading, userChats]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = Chats.onMessagesSnapshot(chatId, (data) => {
      setMessages(data);
      Chats.markRead(chatId, "user").catch(() => {});
    });
    return () => unsub();
  }, [chatId]);

  async function startChat(category: string, issueType: string) {
    if (!user) return;
    setCreatingChat(true);
    try {
      const data = await Chats.create(user.id, user.name, category, issueType);
      setChatId(data.chat.chatId);
      setMessages(data.messages);
      setIsNewChat(false);
      setPhase("chat");
    } catch {
    } finally {
      setCreatingChat(false);
    }
  }

  function startNewChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsNewChat(true);
    setChatId(null);
    setMessages([]);
    setPhase("chat");
  }

  function handleQuickIssue(issue: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const category = issue.includes("Lead") || issue.includes("Campaign") || issue.includes("Ads")
      ? "Meta Ads Problems"
      : issue.includes("Subscription") || issue.includes("App login") || issue.includes("Payment")
      ? "Premium App Subscription"
      : "General Support";
    startChat(category, issue);
  }

  async function sendMessage() {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText("");

    if (isNewChat && !chatId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      startChat("General Support", text);
      return;
    }

    if (!chatId) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Chats.sendMessage(chatId, "user", text);
    } catch {
      Alert.alert("Error", "Could not send message. Please try again.");
    }
    setSending(false);
  }

  async function pickImage() {
    if (!chatId && !isNewChat) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.3,
        base64: true,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const imageUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      if (isNewChat && !chatId) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCreatingChat(true);
        try {
          if (!user) { Alert.alert("Error", "Please log in to send images."); setCreatingChat(false); return; }
          const data = await Chats.create(user.id, user.name, "General Support", "Photo attachment");
          setChatId(data.chat.chatId);
          setMessages(data.messages);
          setIsNewChat(false);
          setPhase("chat");
          await Chats.sendMessage(data.chat.chatId, "user", "", { imageUri, fileName: "Photo", fileType: "image" });
        } finally {
          setCreatingChat(false);
        }
        return;
      }

      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (chatId) await Chats.sendMessage(chatId, "user", "", { imageUri, fileName: "Photo", fileType: "image" });
      setSending(false);
    } catch (e) {
      setSending(false);
      Alert.alert("Error", "Could not send image. Please try again.");
    }
  }

  async function pickDocument() {
    if (!chatId && !isNewChat) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const fileName = asset.name || "Document";
      const fileType = asset.mimeType || "file";

      if (isNewChat && !chatId) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCreatingChat(true);
        try {
          const data = await Chats.create(user!.id, user!.name, "General Support", "File attachment");
          setChatId(data.chat.chatId);
          setMessages(data.messages);
          setIsNewChat(false);
          setPhase("chat");
          await Chats.sendMessage(data.chat.chatId, "user", `Sent: ${fileName}`, { fileName, fileType });
        } finally {
          setCreatingChat(false);
        }
        return;
      }

      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Chats.sendMessage(chatId!, "user", `Sent: ${fileName}`, { fileName, fileType });
      setSending(false);
    } catch (e) {
      setSending(false);
      Alert.alert("Error", "Could not send file. Please try again.");
    }
  }

  function openExistingChat(chat: ChatData) {
    setChatId(chat.chatId);
    setIsNewChat(false);
    setPhase("chat");
  }

  function renderQuickIssues() {
    return (
      <View style={quickStyles.container}>
        <View style={quickStyles.header}>
          <Ionicons name="flash-outline" size={16} color={colors.tint} />
          <Text style={[quickStyles.headerText, { color: colors.textSecondary }]}>Quick select or type your message below</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={quickStyles.chipScroll}>
          {QUICK_ISSUES.map((issue) => (
            <Pressable
              key={issue.label}
              style={({ pressed }) => [
                quickStyles.chip,
                { backgroundColor: issue.color + "12", borderColor: issue.color + "30", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleQuickIssue(issue.label)}
            >
              <Ionicons name={issue.icon} size={14} color={issue.color} />
              <Text style={[quickStyles.chipText, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>{issue.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  function renderHistory() {
    if (loading) {
      return (
        <View style={histStyles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    return (
      <View>
        <Animated.View entering={FadeInDown.duration(400)} style={selectStyles.welcomeBox}>
          <View style={[selectStyles.welcomeIcon, { backgroundColor: colors.tint + "18" }]}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.tint} />
          </View>
          <Text style={[selectStyles.welcomeTitle, { color: colors.text }]}>
            Support Chat
          </Text>
          <Text style={[selectStyles.welcomeSub, { color: colors.textSecondary }]}>
            Chat with our team for quick help
          </Text>
        </Animated.View>

        {userChats.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ paddingHorizontal: 16 }}>
            <Text
              style={[
                histStyles.sectionLabel,
                { color: colors.textSecondary },
              ]}
            >
              Recent Conversations
            </Text>
            {userChats.map((chat) => (
              <Pressable
                key={chat.chatId}
                style={[
                  histStyles.chatItem,
                  {
                    backgroundColor: isDark ? "#162032" : "#FFF",
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openExistingChat(chat)}
              >
                <View style={[histStyles.chatIcon, { backgroundColor: chat.issueCategory.includes("Meta") ? "#F9731618" : "#8B5CF618" }]}>
                  <Ionicons
                    name={chat.issueCategory.includes("Meta") ? "megaphone-outline" : "diamond-outline"}
                    size={18}
                    color={chat.issueCategory.includes("Meta") ? "#F97316" : "#8B5CF6"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={histStyles.chatTopRow}>
                    <Text
                      style={[histStyles.chatTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {chat.issueType}
                    </Text>
                    <View
                      style={[
                        histStyles.statusBadge,
                        {
                          backgroundColor:
                            chat.status === "open"
                              ? colors.success + "18"
                              : colors.textSecondary + "18",
                        },
                      ]}
                    >
                      <View
                        style={[
                          histStyles.statusDot,
                          {
                            backgroundColor:
                              chat.status === "open"
                                ? colors.success
                                : colors.textSecondary,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          histStyles.statusText,
                          {
                            color:
                              chat.status === "open"
                                ? colors.success
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {chat.status}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[histStyles.chatPreview, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    Issue: {chat.issueCategory} - {chat.issueType}
                  </Text>
                </View>
                {(chat.unreadUser || 0) > 0 && (
                  <View style={[histStyles.unread, { backgroundColor: colors.tint }]}>
                    <Text style={histStyles.unreadText}>{chat.unreadUser}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Pressable
            onPress={startNewChat}
          >
            <LinearGradient
              colors={["#0D9488", "#14B8A6", "#2DD4BF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={histStyles.newChatBtn}
            >
              <Ionicons name="add-circle-outline" size={22} color="#FFF" />
              <Text style={histStyles.newChatText}>Chat With Us</Text>
            </LinearGradient>
          </Pressable>

        </Animated.View>
      </View>
    );
  }

  const reversedMessages = React.useMemo(() => [...messages].reverse(), [messages]);

  function renderChat() {

    return (
      <View style={{ flex: 1 }}>
        {isNewChat && messages.length === 0 && !creatingChat ? (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
              <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center" }}>
                <View style={[quickStyles.welcomeIcon, { backgroundColor: colors.tint + "15" }]}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.tint} />
                </View>
                <Text style={[quickStyles.welcomeTitle, { color: colors.text }]}>How can we help?</Text>
                <Text style={[quickStyles.welcomeSub, { color: colors.textSecondary }]}>
                  Tap a quick option or type your message
                </Text>
              </Animated.View>
            </View>
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              {renderQuickIssues()}
            </Animated.View>
          </View>
        ) : creatingChat ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15, fontFamily: "Inter_500Medium" }}>Starting conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversedMessages}
            keyExtractor={(item) => item.messageId}
            renderItem={({ item }) => (
              <MessageBubble msg={item} colors={colors} isDark={isDark} onImagePress={(uri) => setPreviewImage(uri)} />
            )}
            inverted
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View
          style={[
            chatInputStyles.container,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFF",
              borderTopColor: colors.border,
              paddingBottom: Math.max(bottomPadding, 8),
            },
          ]}
        >
          <View style={chatInputStyles.attachRow}>
            <Pressable
              style={({ pressed }) => [chatInputStyles.attachBtn, { opacity: pressed ? 0.5 : 1 }]}
              onPress={pickImage}
              disabled={sending}
            >
              <Ionicons name="image-outline" size={22} color={colors.tint} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [chatInputStyles.attachBtn, { opacity: pressed ? 0.5 : 1 }]}
              onPress={pickDocument}
              disabled={sending}
            >
              <Ionicons name="document-attach-outline" size={22} color={colors.tint} />
            </Pressable>
          </View>
          <View
            style={[
              chatInputStyles.inputWrapper,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[chatInputStyles.input, { color: colors.text }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>
          <Pressable
            style={[
              chatInputStyles.sendBtn,
              {
                backgroundColor:
                  inputText.trim() ? colors.tint : colors.border,
              },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            backgroundColor: isDark ? "#0F172A" : "#FFF",
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (phase === "chat") {
              setChatId(null);
              setMessages([]);
              setIsNewChat(false);
              setPhase("history");
            } else {
              router.back();
            }
          }}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {phase === "chat" ? "Support Chat" : "Support"}
          </Text>
          {phase === "chat" && (
            <View style={styles.onlineRow}>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: isOnline ? "#22C55E" : "#94A3B8" },
                ]}
              />
              <Text
                style={[
                  styles.onlineText,
                  { color: isOnline ? "#22C55E" : colors.textSecondary },
                ]}
              >
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          )}
        </View>

        <View style={{ width: 24 }} />
      </View>

      {phase === "history" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {renderHistory()}
        </ScrollView>
      )}
      {phase === "chat" && renderChat()}

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" }}>
          <Pressable
            style={{ position: "absolute", top: Platform.OS === "web" ? 20 : topPadding + 10, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </Pressable>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={{ width: Dimensions.get("window").width, height: Dimensions.get("window").height * 0.75 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const histStyles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chatTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  chatPreview: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" as const },
  unread: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  newChatBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  newChatText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  whatsappText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#25D366",
  },
});

const quickStyles = StyleSheet.create({
  container: { paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chipScroll: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6, letterSpacing: -0.3 },
  welcomeSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 280,
  },
});

const selectStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 4 },
  welcomeBox: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  welcomeTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 8, letterSpacing: -0.3 },
  welcomeSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 300,
  },
});

const chatInputStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 24,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  attachRow: {
    flexDirection: "column",
    gap: 4,
    marginBottom: 2,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
