import { View, useSurfaceTransition } from "@/components/theme-primitives";
import { useIsFocused } from "expo-router";
import { LinearGradient } from "@/components/theme-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from "react-native-reanimated";

type MotionProps = {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

const EASE = Easing.bezier(0.22, 0.8, 0.2, 1);

// Cada entrada de pestaña reinicia su secuencia de componentes.
export function TabScene({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return focused ? <>{children}</> : <View style={styles.offscreen} />;
}

// Entrada breve que mantiene la continuidad entre superficies.
export function MotionView({ children, delay = 0, style }: MotionProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    progress.value = reduced ? 1 : 0;

    if (!reduced) {
      progress.value = withDelay(delay, withTiming(1, { duration: 520, easing: EASE }),);
    }

    return () => cancelAnimation(progress);
  }, [delay, progress, reduced]);

  const animated = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateX: (1 - progress.value) * -22 }] }));

  return (
    <Animated.View style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

export function MotionText({ text, delay = 0, numberOfLines, style, containerStyle }: {
  text: string;
  delay?: number;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    progress.value = reduced ? 1 : 0;

    if (!reduced) {
      progress.value = withDelay(delay, withTiming(1, { duration: 520, easing: EASE }),);
    }

    return () => cancelAnimation(progress);
  }, [delay, progress, reduced]);

  const animated = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 5 }] }));

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text} style={[styles.mask, containerStyle]}>
      <Animated.Text numberOfLines={numberOfLines} style={[style, animated, { transitionProperty: "color", transitionDuration: reduced ? 0 : 320 }]}>
        {text}
      </Animated.Text>
    </View>
  );
}

export function MotionIcon({ children, delay = 0 }: {
  children: ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.78);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    scale.value = reduced ? 1 : 0.78;
    opacity.value = reduced ? 1 : 0;

    if (!reduced) {
      scale.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 195 }),);

      opacity.value = withDelay(delay, withTiming(1, { duration: 370, easing: EASE }),);
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [delay, opacity, reduced, scale]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: (1 - opacity.value) * -10 }, { scale: scale.value }] }));

  return (
    <Animated.View style={animated}>
      {children}
    </Animated.View>
  );
}

// El contenedor comienza pequeño en el centro.
// Su contenido aparece cuando está casi totalmente expandido.
export function MotionPanel({ children, delay = 0, style, contentStyle }: MotionProps & {
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const colorTransition = useSurfaceTransition();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    progress.value = reduced ? 1 : 0;

    if (!reduced) {
      progress.value = withDelay(delay, withTiming(1, { duration: 840, easing: EASE }),);
    }

    return () => cancelAnimation(progress);
  }, [delay, progress, reduced]);

  const surface = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.12, 1],
      [0, 1, 1],
    ),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.68, 1],) }],
  }));

  const content = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.62, 1],
      [0, 0, 1],
    ),
    transform: [{ translateX: interpolate(progress.value, [0, 0.62, 1], [-14, -14, 0],) }],
  }));

  return (
    <Animated.View style={[style, surface, colorTransition]}>
      <Animated.View style={[styles.panelContent, contentStyle, content]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export function SkeletonBlock({ height, isDark, width = "100%", radius = 15 }: {
  height: number;
  isDark: boolean;
  width?: number | `${number}%`;
  radius?: number;
}) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced || !focused || measuredWidth === 0) return;

    sweep.value = 0;

    sweep.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false,);

    return () => cancelAnimation(sweep);
  }, [focused, measuredWidth, reduced, sweep]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: -140 + (measuredWidth + 280) * sweep.value }] }));

  return (
    <View
      accessibilityLabel="Cargando información"
      onLayout={(event) =>
        setMeasuredWidth(event.nativeEvent.layout.width)
      }
      style={{ width, height, overflow: "hidden", borderRadius: radius, backgroundColor: isDark ? "#2A3146" : "#E5E8F1" }}
    >
      {!reduced && measuredWidth > 0 && (
        <Animated.View pointerEvents="none" style={[styles.sweep, animated]}>
          <LinearGradient
            colors={["transparent", isDark ? "#FFFFFF1A" : "#FFFFFFC2", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { flex: 1 },
  mask: { overflow: "visible", minWidth: 0, flexShrink: 1 },
  panelContent: { width: "100%" },
  sweep: { position: "absolute", top: 0, bottom: 0, left: 0, width: 140 },
});
