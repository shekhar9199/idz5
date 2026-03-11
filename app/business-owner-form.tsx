import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Switch,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/useTheme";
import { cardShadow } from "@/lib/shadows";
import { BusinessOwners } from "@/lib/firestore";

const BUSINESS_TYPES = ["Product", "Service", "Both"];
const SELL_MODES = ["Online", "Offline", "Both"];
const GENDERS = ["Male", "Female", "Both"];
const AUDIENCE_TYPES = ["Local", "National", "International"];
const AD_GOALS = ["Sales", "Leads", "Brand Awareness", "App Installs", "Website Traffic"];
const AD_PLATFORMS = ["Facebook", "Instagram", "Google"];

function DropdownSelect({ label, options, value, onChange, colors, isDark }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; colors: any; isDark: boolean;
}) {
  return (
    <View style={s.dropdownWrap}>
      <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={s.chipRow}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[
              s.chip,
              {
                backgroundColor: value === opt ? colors.tint : isDark ? "#1E293B" : "#F1F5F9",
                borderColor: value === opt ? colors.tint : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); onChange(opt); }}
          >
            <Text style={[s.chipText, { color: value === opt ? "#FFF" : colors.text }]}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CheckboxGroup({ label, options, values, onChange, colors, isDark }: {
  label: string; options: string[]; values: string[];
  onChange: (v: string[]) => void; colors: any; isDark: boolean;
}) {
  const toggle = (opt: string) => {
    Haptics.selectionAsync();
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  };
  return (
    <View style={s.dropdownWrap}>
      <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={s.chipRow}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[
              s.chip,
              {
                backgroundColor: values.includes(opt) ? colors.tint : isDark ? "#1E293B" : "#F1F5F9",
                borderColor: values.includes(opt) ? colors.tint : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              },
            ]}
            onPress={() => toggle(opt)}
          >
            <Text style={[s.chipText, { color: values.includes(opt) ? "#FFF" : colors.text }]}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange, colors }: {
  label: string; value: boolean; onChange: (v: boolean) => void; colors: any;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={[s.toggleLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
        trackColor={{ false: "#76767650", true: colors.tint + "80" }}
        thumbColor={value ? colors.tint : "#CCC"}
      />
    </View>
  );
}

function FormInput({ label, value, onChange, colors, isDark, placeholder, required, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  colors: any; isDark: boolean; placeholder?: string;
  required?: boolean; multiline?: boolean; keyboardType?: string;
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={[s.inputLabel, { color: colors.textSecondary }]}>
        {label}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
      <TextInput
        style={[
          s.input,
          multiline && s.inputMultiline,
          {
            backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || label}
        placeholderTextColor={colors.textSecondary + "80"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType as any || "default"}
      />
    </View>
  );
}

function SectionHeader({ icon, title, colors, gradient }: {
  icon: string; title: string; colors: any; gradient: [string, string];
}) {
  return (
    <View style={s.sectionHeader}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sectionIconWrap}>
        <Ionicons name={icon as any} size={16} color="#FFF" />
      </LinearGradient>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

export default function BusinessOwnerFormScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState(user?.name || "");
  const [contactNumber, setContactNumber] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [sellMode, setSellMode] = useState("");
  const [usp, setUsp] = useState("");
  const [targetAgeRange, setTargetAgeRange] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [ranAdsBefore, setRanAdsBefore] = useState(false);
  const [platformsUsed, setPlatformsUsed] = useState<string[]>([]);
  const [monthlyAdBudget, setMonthlyAdBudget] = useState("");
  const [adGoal, setAdGoal] = useState("");
  const [creativesReady, setCreativesReady] = useState(false);

  const cardBg = isDark ? "#111B2E" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  async function handleSubmit() {
    if (!businessName.trim()) { Alert.alert("Required", "Please enter your Business Name."); return; }
    if (!ownerName.trim()) { Alert.alert("Required", "Please enter the Owner Name."); return; }
    if (!contactNumber.trim()) { Alert.alert("Required", "Please enter your Contact Number."); return; }
    if (!email.trim()) { Alert.alert("Required", "Please enter your Email Address."); return; }
    if (!businessType) { Alert.alert("Required", "Please select your Business Type."); return; }
    if (!sellMode) { Alert.alert("Required", "Please select your Sell Mode."); return; }
    if (!targetGender) { Alert.alert("Required", "Please select Target Gender."); return; }
    if (!adGoal) { Alert.alert("Required", "Please select your Ad Goal."); return; }
    if (!user) { Alert.alert("Error", "Please log in first."); return; }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await BusinessOwners.create({
        userId: user.id,
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        location: location.trim(),
        website: website.trim(),
        socialLinks: socialLinks.trim(),
        businessType,
        industry: industry.trim(),
        yearsInBusiness: yearsInBusiness.trim(),
        sellMode,
        usp: usp.trim(),
        targetAgeRange: targetAgeRange.trim(),
        targetGender,
        targetLocation: targetLocation.trim(),
        audienceType,
        problemSolved: problemSolved.trim(),
        ranAdsBefore,
        platformsUsed,
        monthlyAdBudget: monthlyAdBudget.trim(),
        adGoal,
        creativesReady,
        averagePrice: "",
        profitMargin: "",
        currentMonthlySales: "",
        paymentGatewaySetup: false,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitSuccess(true);
      setTimeout(() => {
        router.replace("/meta-ads-business");
      }, 1500);
    } catch {
      Alert.alert("Error", "Failed to save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.scrollContent, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8, paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <LinearGradient
            colors={isDark ? ["#1E3A5F", "#0F2940"] : ["#3B82F6", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroBanner}
          >
            <Ionicons name="briefcase" size={32} color="rgba(255,255,255,0.9)" />
            <Text style={s.heroTitle}>Tell us about your business</Text>
            <Text style={s.heroSub}>This information helps us create the most effective ad campaigns tailored to your needs.</Text>
          </LinearGradient>

          <View style={[s.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow, 3)]}>
            <SectionHeader icon="business" title="Basic Business Information" colors={colors} gradient={["#3B82F6", "#2563EB"]} />
            <FormInput label="Business Name" value={businessName} onChange={setBusinessName} colors={colors} isDark={isDark} required placeholder="e.g. ABC Digital Solutions" />
            <FormInput label="Owner Name" value={ownerName} onChange={setOwnerName} colors={colors} isDark={isDark} required placeholder="Full name" />
            <FormInput label="Contact Number" value={contactNumber} onChange={setContactNumber} colors={colors} isDark={isDark} required placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
            <FormInput label="Email Address" value={email} onChange={setEmail} colors={colors} isDark={isDark} required placeholder="you@example.com" keyboardType="email-address" />
            <FormInput label="Business Location (City/State)" value={location} onChange={setLocation} colors={colors} isDark={isDark} placeholder="e.g. Mumbai, Maharashtra" />
            <FormInput label="Website (optional)" value={website} onChange={setWebsite} colors={colors} isDark={isDark} placeholder="https://yourwebsite.com" keyboardType="url" />
            <FormInput label="Social Media Links (optional)" value={socialLinks} onChange={setSocialLinks} colors={colors} isDark={isDark} placeholder="Instagram, Facebook URLs" />
          </View>

          <View style={[s.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow, 3)]}>
            <SectionHeader icon="layers" title="Business Details" colors={colors} gradient={["#10B981", "#059669"]} />
            <DropdownSelect label="Business Type" options={BUSINESS_TYPES} value={businessType} onChange={setBusinessType} colors={colors} isDark={isDark} />
            <FormInput label="Industry" value={industry} onChange={setIndustry} colors={colors} isDark={isDark} placeholder="e.g. Fashion, Food, Tech" />
            <FormInput label="Years in Business" value={yearsInBusiness} onChange={setYearsInBusiness} colors={colors} isDark={isDark} placeholder="e.g. 3" keyboardType="number-pad" />
            <DropdownSelect label="Sell Mode" options={SELL_MODES} value={sellMode} onChange={setSellMode} colors={colors} isDark={isDark} />
            <FormInput label="Unique Selling Point" value={usp} onChange={setUsp} colors={colors} isDark={isDark} multiline placeholder="What makes your business unique?" />
          </View>

          <View style={[s.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow, 3)]}>
            <SectionHeader icon="people" title="Target Audience" colors={colors} gradient={["#8B5CF6", "#7C3AED"]} />
            <FormInput label="Target Age Range" value={targetAgeRange} onChange={setTargetAgeRange} colors={colors} isDark={isDark} placeholder="e.g. 18-35" />
            <DropdownSelect label="Gender" options={GENDERS} value={targetGender} onChange={setTargetGender} colors={colors} isDark={isDark} />
            <FormInput label="Target Location" value={targetLocation} onChange={setTargetLocation} colors={colors} isDark={isDark} placeholder="e.g. Pan India, Delhi NCR" />
            <DropdownSelect label="Audience Type" options={AUDIENCE_TYPES} value={audienceType} onChange={setAudienceType} colors={colors} isDark={isDark} />
            <FormInput label="Problem Your Business Solves" value={problemSolved} onChange={setProblemSolved} colors={colors} isDark={isDark} multiline placeholder="Describe the problem you solve for customers" />
          </View>

          <View style={[s.card, { backgroundColor: cardBg, borderColor }, cardShadow(colors.cardShadow, 3)]}>
            <SectionHeader icon="megaphone" title="Marketing & Ads" colors={colors} gradient={["#F59E0B", "#D97706"]} />
            <ToggleRow label="Ran Ads Before?" value={ranAdsBefore} onChange={setRanAdsBefore} colors={colors} />
            {ranAdsBefore && (
              <CheckboxGroup label="Platforms Used" options={AD_PLATFORMS} values={platformsUsed} onChange={setPlatformsUsed} colors={colors} isDark={isDark} />
            )}
            <FormInput label="Monthly Ad Budget" value={monthlyAdBudget} onChange={setMonthlyAdBudget} colors={colors} isDark={isDark} placeholder="e.g. 10,000" keyboardType="number-pad" />
            <DropdownSelect label="Ad Goal" options={AD_GOALS} value={adGoal} onChange={setAdGoal} colors={colors} isDark={isDark} />
            <ToggleRow label="Creatives Ready?" value={creativesReady} onChange={setCreativesReady} colors={colors} />
          </View>

          <Pressable
            style={({ pressed }) => [
              s.submitBtn,
              { backgroundColor: colors.tint, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={s.submitInner}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={s.submitText}>Submit Details</Text>
              </View>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>

      {submitSuccess && (
        <View style={s.toastOverlay}>
          <View style={s.toastCard}>
            <View style={s.toastIconWrap}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={s.toastTitle}>Details Submitted!</Text>
            <Text style={s.toastSub}>Redirecting to ad setup...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  heroBanner: {
    borderRadius: 18, padding: 22, marginBottom: 18, alignItems: "center", gap: 8,
  },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 18 },
  card: {
    borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14, gap: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginLeft: 2 },
  input: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  inputMultiline: { minHeight: 80, paddingTop: 12 },
  dropdownWrap: { gap: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  submitBtn: {
    height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  toastCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
    width: 260,
  },
  toastIconWrap: { marginBottom: 4 },
  toastTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#111" },
  toastSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
});
