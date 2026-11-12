import { useEffect, useRef, useState } from "react";
import { Animated as NativeAnimated, Easing, Text, type StyleProp, type TextStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

type Props = {
  value: number | null;
  label: string;
  suffix?: string;
  delay?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

export function AnimatedNumber({ value, label, suffix = "", delay = 0, duration = 1050, style }: Props) {
  const reducedMotion = useReducedMotion();
  const target = value !== null && Number.isFinite(value) ? value : null;
  const motion = useRef(new NativeAnimated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (target === null) return;

    const id = motion.addListener(({ value: next }) => {
      setShown(Math.round(next));
    });

    if (reducedMotion) {
      motion.setValue(target);
      setShown(Math.round(target));
    } else {
      NativeAnimated.timing(motion, { toValue: target, delay, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
        if (finished) setShown(Math.round(target));
      });
    }

    return () => {
      motion.stopAnimation();
      motion.removeListener(id);
    };
  }, [delay, duration, motion, reducedMotion, target]);

  return (
    <Text
      style={style}
      accessibilityLabel={`${label}: ${target === null ? "sin datos" : `${Math.round(target)}${suffix}`}`}
    >
      {target === null ? "—" : `${shown}${suffix}`}
    </Text>
  );
}
