import { Text } from "@/components/theme-primitives";
import { useEffect, useState } from "react";
import { Animated as NativeAnimated, Easing, type StyleProp, type TextStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

type Props = {
  value: number | null;
  label: string;
  suffix?: string;
  delay?: number;
  duration?: number;
  decimalPlaces?: 0 | 1 | 2;
  style?: StyleProp<TextStyle>;
};

export function AnimatedNumber({ value, label, suffix = "", delay = 0, duration = 1050, decimalPlaces = 0, style }: Props) {
  const reducedMotion = useReducedMotion();
  const target = value !== null && Number.isFinite(value) ? value : null;
  const [motion] = useState(() => new NativeAnimated.Value(0));
  const [shown, setShown] = useState(0);
  const precision = 10 ** decimalPlaces;
  const roundedTarget = target === null ? null : Math.round(target * precision) / precision;

  useEffect(() => {
    if (target === null) return;

    if (reducedMotion) {
      motion.setValue(target);
      return;
    }

    const id = motion.addListener(({ value: next }) => {
      const rounded = Math.round(next * precision) / precision;
      setShown((previous) => previous === rounded ? previous : rounded);
    });

    NativeAnimated.timing(motion, { toValue: target, delay, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (finished) setShown(Math.round(target * precision) / precision);
    });

    return () => {
      motion.stopAnimation();
      motion.removeListener(id);
    };
  }, [delay, duration, motion, precision, reducedMotion, target]);

  return (
    <Text
      style={style}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      accessibilityLabel={`${label}: ${roundedTarget === null ? "sin datos" : `${roundedTarget}${suffix}`}`}
    >
      {target === null ? "—" : `${reducedMotion ? roundedTarget : shown}${suffix}`}
    </Text>
  );
}
