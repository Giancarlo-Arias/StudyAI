import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";

import type { DashboardStyles } from "@/styles/dashboard.styles";

type Props = {
  styles: DashboardStyles;
};

export function DashboardSkeleton({ styles }: Props) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;

    async function begin() {
      const reduced =
        await AccessibilityInfo.isReduceMotionEnabled();

      if (!active || reduced) {
        pulse.setValue(0.8);
        return;
      }

      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.45, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );

      animation.start();
    }

    void begin();

    return () => {
      active = false;
      animation?.stop();
    };
  }, [pulse]);

  return (
    <Animated.View style={[styles.content, { opacity: pulse }]}>
      <View style={[styles.skeleton, { width: 125, height: 38 }]} />

      <View style={{ gap: 10, paddingTop: 24 }}>
        <View style={[styles.skeleton, { width: 95, height: 11 }]} />

        <View style={[styles.skeleton, { width: "76%", height: 40 }]} />

        <View style={[styles.skeleton, { width: "85%", height: 15 }]} />
      </View>

      <View style={[styles.skeleton, styles.skeletonHero]} />

      <View style={{ gap: 15 }}>
        <View style={[styles.skeleton, { width: 170, height: 24 }]} />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={[styles.skeleton, styles.skeletonFeature]} />

          <View style={[styles.skeleton, styles.skeletonFeature]} />
        </View>
      </View>
    </Animated.View>
  );
}
