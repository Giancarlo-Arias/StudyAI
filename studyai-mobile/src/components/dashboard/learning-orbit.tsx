import { View } from "@/components/theme-primitives";
import { LinearGradient } from "@/components/theme-gradient";
import { BrainCircuit } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export function LearningOrbit() {
  const [float] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;

    async function begin() {
      const reduced =
        await AccessibilityInfo.isReduceMotionEnabled();

      if (!active || reduced) return;

      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );

      animation.start();
    }

    void begin();

    return () => {
      active = false;
      animation?.stop();
    };
  }, [float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox="0 0 300 260" fill="none">
        <Circle cx="151" cy="129" r="110" stroke="#D6C8FF" strokeOpacity="0.30" strokeWidth="1" />

        <Circle cx="151" cy="129" r="88" stroke="#F2EBFF" strokeOpacity="0.48" strokeWidth="1" strokeDasharray="4 9" />

        <Circle cx="151" cy="129" r="68" fill="#FFFFFF" fillOpacity="0.10" />

        <Circle cx="151" cy="129" r="64" stroke="#FFFFFF" strokeOpacity="0.35" />

        <Path
          d="M30 152C90 27 232 18 281 119"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          strokeDasharray="3 7"
        />

        <Circle cx="251" cy="62" r="9" fill="#C9EDFF" />

        <Circle cx="251" cy="62" r="3.5" fill="#695DD4" />

        <Circle cx="76" cy="207" r="6" fill="#E9C8FF" />

        <Circle cx="268" cy="182" r="3" fill="#FFFFFF" />

        <Circle cx="56" cy="95" r="3" fill="#FFFFFF" fillOpacity="0.78" />
      </Svg>

      <Animated.View style={[styles.core, { transform: [{ translateY }] }]}>
        <LinearGradient
          colors={["#C3ADFF", "#9278F2", "#6A58CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coreInner}
        >
          <BrainCircuit size={42} color="#FFFFFF" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%" },
  core: {
    position: "absolute",
    top: 81,
    left: 103,
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: "#211A65",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  coreInner: { flex: 1, borderRadius: 44, justifyContent: "center", alignItems: "center" },
});
