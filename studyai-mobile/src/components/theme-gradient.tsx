import { LinearGradient as ExpoLinearGradient, type LinearGradientProps } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

// El fundido pertenece al fondo. Los hijos permanecen montados y visibles.
export function LinearGradient({ colors, children, style, onLayout, ...props }: LinearGradientProps) {
  const reduced = useReducedMotion();
  const key = colors.join("|");
  const [history, setHistory] = useState({ key, colors, previous: colors, changed: false });

  if (history.key !== key) {
    setHistory({ key, colors, previous: history.colors, changed: true });
  }

  return (
    <View style={style} onLayout={onLayout}>
      <ExpoLinearGradient {...props} colors={history.previous} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Animated.View key={key} pointerEvents="none" entering={history.changed && !reduced ? FadeIn.duration(320) : undefined} style={StyleSheet.absoluteFill}>
        <ExpoLinearGradient {...props} colors={colors} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {children}
    </View>
  );
}
