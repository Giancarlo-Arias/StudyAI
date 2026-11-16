import { View } from "@/components/theme-primitives";
import { useEffect, useState } from "react";

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

  return (
    <DelayedScoreChart
      key={`${delayMs}-${reduced}`}
      attempts={attempts}
      isDark={isDark}
      delayMs={reduced ? 0 : delayMs}
    />
  );
}

function DelayedScoreChart({ attempts, isDark, delayMs }: Required<Props>) {
  const [ready, setReady] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) return;

    const id = setTimeout(() => {
      setReady(true);
    }, delayMs);

    return () => clearTimeout(id);
  }, [delayMs]);

  return (
    <View style={{ minHeight: 235 }}>
      {ready ? (<ScoreChart attempts={attempts} isDark={isDark} />) : null}
    </View>
  );
}
