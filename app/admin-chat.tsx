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
  Image,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/lib/useTheme";
import { Chats } from "@/lib/firestore";

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

interface ChatInfo {
  chatId: string;
  userId: string;
  userName: string;
  issueCategory: string;
  issueType: string;
  status: "open" | "resolved";
}

function AdminBubble({ msg, colors, isDark, onImagePress }: { msg: ChatMsg; colors: any; isDark: boolean; onImagePress?: (uri: string) => void }) {
  const isAdmin = msg.sender === "admin";
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
    <View style={[bStyles.row, isAdmin ? bStyles.rowRight : bStyles.rowLeft]}>
      {!isAdmin && (
        <View style={[bStyles.avatar, { backgroundColor: "#3B82F6" }]}>
          <Text style={bStyles.avatarText}>
            U
          </Text>
        </View>
      )}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={[
          bStyles.bubble,
          isAdmin
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
              style={{ width: 200, height: 200, borderRadius: 12, marginBottom: msg.message ? 6 : 0 }}
              resizeMode="cover"
            />
          </Pressable>
        )}
        {msg.fileName && !msg.imageUri && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, marginBottom: msg.message ? 4 : 0 }}>
            <Ionicons name="document-outline" size={18} color={isAdmin ? "#FFF" : colors.tint} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: isAdmin ? "#FFF" : colors.tint }}>{msg.fileName}</Text>
          </View>
        )}
        {msg.message ? (
          <Text style={[bStyles.text, { color: isAdmin ? "#FFF" : colors.text }]}>
            {msg.message}
          </Text>
        ) : null}
        <View style={bStyles.meta}>
          <Text
            style={[
              bStyles.time,
              { color: isAdmin ? "rgba(255,255,255,0.7)" : colors.textSecondary },
            ]}
          >
            {time}
          </Text>
          {isAdmin && (
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
  );
}

const bStyles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 3, paddingHorizontal: 12, alignItems: "flex-end" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginRight: 6, marginBottom: 2,
  },
  avatarText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  text: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

export default function AdminChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;
    const unsub = Chats.onChatSnapshot(chatId, (data) => {
      if (data) setChatInfo(data);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = Chats.onMessagesSnapshot(chatId, (data) => {
      setMessages(data);
      setLoading(false);
      Chats.markRead(chatId, "admin").catch(() => {});
    });
    return () => unsub();
  }, [chatId]);

  async function sendMessage() {
    if (!inputText.trim() || !chatId || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Chats.sendMessage(chatId, "admin", text);
    } catch {}
    setSending(false);
  }

  async function pickImage() {
    if (!chatId) return;
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

      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Chats.sendMessage(chatId, "admin", "", { imageUri, fileName: "Photo", fileType: "image" });
      setSending(false);
    } catch {
      setSending(false);
      Alert.alert("Error", "Could not send image. Please try again.");
    }
  }

  async function pickDocument() {
    if (!chatId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const fileName = asset.name || "Document";
      const fileType = asset.mimeType || "file";

      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Chats.sendMessage(chatId, "admin", `Sent: ${fileName}`, { fileName, fileType });
      setSending(false);
    } catch {
      setSending(false);
      Alert.alert("Error", "Could not send file. Please try again.");
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const reversedMessages = [...messages].reverse();

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
            router.back();
          }}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {chatInfo?.userName || "User"}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {chatInfo?.issueCategory} - {chatInfo?.issueType}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                chatInfo?.status === "open"
                  ? colors.success + "18"
                  : colors.textSecondary + "18",
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  chatInfo?.status === "open" ? colors.success : colors.textSecondary,
              },
            ]}
          />
          <Text
            style={[
              styles.statusLabel,
              {
                color:
                  chatInfo?.status === "open" ? colors.success : colors.textSecondary,
              },
            ]}
          >
            {chatInfo?.status}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.messageId}
          renderItem={({ item }) => (
            <AdminBubble msg={item} colors={colors} isDark={isDark} onImagePress={(uri) => setPreviewImage(uri)} />
          )}
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFF",
              borderTopColor: colors.border,
              paddingBottom: Math.max(bottomPadding, 8),
            },
          ]}
        >
          <Pressable
            style={styles.attachBtn}
            onPress={pickImage}
            hitSlop={8}
          >
            <Ionicons name="image-outline" size={22} color={colors.tint} />
          </Pressable>
          <Pressable
            style={styles.attachBtn}
            onPress={pickDocument}
            hitSlop={8}
          >
            <Ionicons name="document-outline" size={22} color={colors.tint} />
          </Pressable>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Reply as admin..."
              placeholderTextColor={colors.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
          </View>
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? colors.tint : colors.border },
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
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" as const },
  inputContainer: {
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
  attachBtn: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
