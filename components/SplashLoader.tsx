import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Image, Platform, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface SplashLoaderProps {
  onFinish: () => void;
}

const useNative = Platform.OS !== "web";
const { width: SCREEN_W } = Dimensions.get("window");

export function SplashLoader({ onFinish }: SplashLoaderProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoY = useRef(new Animated.Value(30)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let finished = false;
    const done = () => {
      if (!finished) {
        finished = true;
        onFinish();
      }
    };

    const isWeb = Platform.OS === "web";
    const fallback = setTimeout(done, isWeb ? 2000 : 3500);
    const dur = (ms: number) => (isWeb ? Math.round(ms * 0.5) : ms);

    const ringPulse1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, { toValue: 1.6, duration: dur(1400), useNativeDriver: useNative }),
          Animated.timing(ring1Opacity, { toValue: 0, duration: dur(1400), useNativeDriver: useNative }),
        ]),
        Animated.parallel([
          Animated.timing(ring1Scale, { toValue: 0.8, duration: 0, useNativeDriver: useNative }),
          Animated.timing(ring1Opacity, { toValue: 0.4, duration: 0, useNativeDriver: useNative }),
        ]),
      ])
    );

    const ringPulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(dur(500)),
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 1.8, duration: dur(1400), useNativeDriver: useNative }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: dur(1400), useNativeDriver: useNative }),
        ]),
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 0.8, duration: 0, useNativeDriver: useNative }),
          Animated.timing(ring2Opacity, { toValue: 0.3, duration: 0, useNativeDriver: useNative }),
        ]),
      ])
    );

    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: dur(500), useNativeDriver: useNative }),
        Animated.timing(logoOpacity, { toValue: 1, duration: dur(700), useNativeDriver: useNative }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: useNative }),
        Animated.timing(logoY, { toValue: 0, duration: dur(700), useNativeDriver: useNative }),
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: dur(500), useNativeDriver: useNative }),
        Animated.timing(nameY, { toValue: 0, duration: dur(500), useNativeDriver: useNative }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: dur(400), useNativeDriver: useNative }),
      Animated.timing(barWidth, { toValue: 1, duration: dur(800), useNativeDriver: false }),
      Animated.delay(dur(150)),
      Animated.timing(fadeOut, { toValue: 0, duration: dur(400), useNativeDriver: useNative }),
    ]);

    ring1Opacity.setValue(0.4);
    ring2Opacity.setValue(0.3);
    ringPulse1.start();
    ringPulse2.start();
    anim.start(() => {
      ringPulse1.stop();
      ringPulse2.stop();
      done();
    });

    return () => {
      clearTimeout(fallback);
      anim.stop();
      ringPulse1.stop();
      ringPulse2.stop();
    };
  }, []);

  const progressBarWidth = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <LinearGradient
        colors={["#060B18", "#0A1628", "#0F1F3A", "#0A1628", "#060B18"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.ring,
                {
                  opacity: ring1Opacity,
                  transform: [{ scale: ring1Scale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring2,
                {
                  opacity: ring2Opacity,
                  transform: [{ scale: ring2Scale }],
                },
              ]}
            />

            <Animated.View
              style={[
                styles.glowCircle,
                { opacity: glowOpacity },
              ]}
            />

            <Animated.View
              style={{
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { translateY: logoY }],
              }}
            >
              <Image
                source={require("@/assets/images/splash-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Animated.Text
            style={[
              styles.appName,
              {
                opacity: nameOpacity,
                transform: [{ translateY: nameY }],
              },
            ]}
          >
            iDigitalZone
          </Animated.Text>

          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
            The Platform we build · Your Trust
          </Animated.Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressBarWidth }]}>
                <LinearGradient
                  colors={["#0D9488", "#7C3AED", "#EC4899"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                />
              </Animated.View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by iDZ</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: "rgba(13, 148, 136, 0.5)",
  },
  ring2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.4)",
  },
  glowCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(13, 148, 136, 0.08)",
  },
  logo: {
    width: 110,
    height: 110,
  },
  appName: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
    marginBottom: 36,
  },
  progressContainer: {
    width: SCREEN_W * 0.45,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressGradient: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 50,
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 1,
  },
});
