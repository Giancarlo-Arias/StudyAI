import { useEffect, useState } from "react";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { ScoreChart } from "@/components/dashboard/score-chart";
import type { RecentAttempt } from "@/lib/dashboard-api";

type Props = {
  attempts: RecentAttempt[];
  isDark: boolean;
  delayMs?: number;
};

export function StagedScoreChart({ attempts, isDark, delayMs = 1200 }: Props) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setReady(true);
      return;
    }

    setReady(false);

    const id = setTimeout(() => {
      setReady(true);
    }, delayMs);

    return () => clearTimeout(id);
  }, [delayMs, reduced]);

  return (
    <View style={{ minHeight: 235 }}>
      {ready ? (<ScoreChart attempts={attempts} isDark={isDark} />) : null}
    </View>
  );
}
