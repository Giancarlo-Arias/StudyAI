import { forwardRef, useState, type ComponentRef } from "react";
import { Pressable as NativePressable, Text as NativeText, View as NativeView, type PressableProps, type TextProps, type ViewProps } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

export function useSurfaceTransition() {
  const reduced = useReducedMotion();
  return { transitionProperty: ["backgroundColor", "borderColor", "shadowColor"] as ("backgroundColor" | "borderColor" | "shadowColor")[], transitionDuration: reduced ? 0 : 320 };
}

// Solo se interpolan colores. El contenido conserva su posición y opacidad.
export const View = forwardRef<ComponentRef<typeof NativeView>, ViewProps>(function ThemeView({ style, ...props }, ref) {
  const transition = useSurfaceTransition();
  return <Animated.View ref={ref} {...props} style={[style, transition]} />;
});

export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(function ThemeText({ style, ...props }, ref) {
  const reduced = useReducedMotion();
  return <Animated.Text ref={ref} {...props} style={[style, { transitionProperty: ["color", "backgroundColor"], transitionDuration: reduced ? 0 : 320 }]} />;
});

export const Pressable = forwardRef<ComponentRef<typeof NativePressable>, PressableProps>(function ThemePressable({ style, ...props }, ref) {
  const transition = useSurfaceTransition();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <AnimatedPressable
      ref={ref}
      {...props}
      onPressIn={(event) => { setPressed(true); props.onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); props.onPressOut?.(event); }}
      onHoverIn={(event) => { setHovered(true); props.onHoverIn?.(event); }}
      onHoverOut={(event) => { setHovered(false); props.onHoverOut?.(event); }}
      style={[typeof style === "function" ? style({ pressed: pressed && !props.disabled, hovered }) : style, transition]}
    />
  );
});
