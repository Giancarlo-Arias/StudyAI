import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { MotionText } from "@/components/dashboard/dashboard-motion";
import type { RecentAttempt } from "@/lib/dashboard-api";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const WIDTH = 340;
const HEIGHT = 161;
const LEFT = 30;
const RIGHT = 330;
const TOP = 16;
const BOTTOM = 130;

type Point = { x: number; y: number; score: number };
type Props = { attempts: RecentAttempt[]; isDark: boolean };

function makeCurve(points: Point[]) {
  if (points.length < 2) return { path: "", length: 0 };

  let path = `M ${points[0].x} ${points[0].y}`;
  let length = 0;

  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];
    const midX = (start.x + end.x) / 2;

    path += ` C ${midX} ${start.y} ${midX} ${end.y} ${end.x} ${end.y}`;

    let previousX = start.x;
    let previousY = start.y;

    for (let step = 1; step <= 24; step++) {
      const t = step / 24;
      const inverse = 1 - t;
      const x =
        inverse ** 3 * start.x + 3 * inverse ** 2 * t * midX + 3 * inverse * t ** 2 * midX + t ** 3 * end.x;
      const y =
        inverse ** 3 * start.y + 3 * inverse ** 2 * t * start.y + 3 * inverse * t ** 2 * end.y + t ** 3 * end.y;

      length += Math.hypot(x - previousX, y - previousY);
      previousX = x;
      previousY = y;
    }
  }

  return { path, length: Math.ceil(length) + 12 };
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("es-CR", { day: "numeric", month: "short" })
    : "Sin fecha";
}

function ChartDot({ point, color, surface, index }: {
  point: Point;
  color: string;
  surface: string;
  index: number;
}) {
  const reduced = useReducedMotion();
  const radius = useSharedValue(reduced ? 3.5 : 0);

  useEffect(() => {
    radius.value = reduced ? 3.5 : withDelay(770 + index * 75, withSpring(3.5, { damping: 12, stiffness: 220 }),);
  }, [index, radius, reduced]);

  const animatedProps = useAnimatedProps(() => ({ r: radius.value }));

  return (
    <AnimatedCircle
      cx={point.x}
      cy={point.y}
      animatedProps={animatedProps}
      fill={color}
      stroke={surface}
      strokeWidth={2}
    />
  );
}

export function ScoreChart({ attempts, isDark }: Props) {
  const reduced = useReducedMotion();
  const entries = useMemo(
    () =>
      attempts.filter((item) => Number.isFinite(item.score_percent))
        .slice(0, 7)
        .reverse(),
    [attempts],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIndex = Math.max(
    0,
    entries.findIndex((entry) => entry.attempt_id === selectedId) >= 0
      ? entries.findIndex((entry) => entry.attempt_id === selectedId)
      : entries.length - 1,
  );

  const colors = {
    ink: isDark ? "#F4F5FC" : "#22263B",
    muted: isDark ? "#AAB3C8" : "#798298",
    accent: isDark ? "#B7AAFF" : "#6B59D5",
    aqua: isDark ? "#77D6D9" : "#128E9C",
    grid: isDark ? "#384159" : "#E7EAF2",
    surface: isDark ? "#1C2235" : "#FFFFFF",
  };

  const points = useMemo<Point[]>(
    () =>
      entries.map((entry, index) => {
        const score = Math.max(0, Math.min(100, entry.score_percent));
        return {
          x:
            entries.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + ((RIGHT - LEFT) * index) / (entries.length - 1),
          y: BOTTOM - (score / 100) * (BOTTOM - TOP),
          score,
        };
      }),
    [entries],
  );

  const curve = useMemo(() => makeCurve(points), [points]);
  const areaPath =
    points.length > 1
      ? `${curve.path} L ${points[points.length - 1].x} ${BOTTOM} L ${points[0].x} ${BOTTOM} Z`
      : "";

  const draw = useSharedValue(reduced ? 1 : 0);
  const fill = useSharedValue(reduced ? 1 : 0);
  const cursorX = useSharedValue(LEFT);
  const cursorY = useSharedValue(BOTTOM);
  const selectedOpacity = useSharedValue(1);

  useEffect(() => {
    draw.value = reduced ? 1 : 0;
    fill.value = reduced ? 1 : 0;
    if (reduced || curve.length === 0) return;

    draw.value = withDelay(520, withTiming(1, { duration: 1050, easing: Easing.bezier(0.24, 0.84, 0.2, 1) }),);
    fill.value = withDelay(930, withTiming(1, { duration: 580 }));
  }, [curve.path, curve.length, draw, fill, reduced]);

  useEffect(() => {
    const selected = points[selectedIndex];
    if (!selected) return;

    cursorX.value = reduced ? selected.x : withSpring(selected.x, { damping: 19, stiffness: 180 });
    cursorY.value = reduced ? selected.y : withSpring(selected.y, { damping: 19, stiffness: 180 });
    selectedOpacity.value = reduced ? 1 : 0;
    if (!reduced) {
      selectedOpacity.value = withTiming(1, { duration: 260 });
    }
  }, [cursorX, cursorY, points, reduced, selectedIndex, selectedOpacity]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: curve.length * (1 - draw.value) }));
  const fillProps = useAnimatedProps(() => ({ opacity: fill.value }));
  const guideProps = useAnimatedProps(() => ({ x1: cursorX.value, x2: cursorX.value }));
  const cursorProps = useAnimatedProps(() => ({ cx: cursorX.value, cy: cursorY.value }));
  const selectionStyle = useAnimatedStyle(() => ({ opacity: selectedOpacity.value, transform: [{ translateY: (1 - selectedOpacity.value) * 6 }] }));

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.ink }]}>
          Aún no hay evaluaciones
        </Text>
        <Text style={[styles.emptyDescription, { color: colors.muted }]}>
          Al completar un cuestionario, aquí podrás explorar tus resultados.
        </Text>
      </View>
    );
  }

  const active = entries[selectedIndex];
  const point = points[selectedIndex];

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.selection, selectionStyle]}>
        <View style={{ overflow: "hidden", minWidth: 78 }}>
          <AnimatedNumber
            key={`score-${active.attempt_id}`}
            value={point.score}
            suffix="%"
            label="Calificación seleccionada"
            delay={130}
            duration={800}
            style={[styles.selectionNumber, { color: colors.ink }]}
          />
        </View>

        <View style={styles.selectionCopy}>
          <MotionText
            key={`title-${active.attempt_id}`}
            text={
              active.quiz_title ||
              `Intento ${selectedIndex + 1}`
            }
            delay={100}
            numberOfLines={1}
            style={[styles.selectionTitle, { color: colors.ink }]}
          />

          <MotionText
            key={`details-${active.attempt_id}`}
            text={
              `${active.correct_count} de ` +
              `${active.question_count} correctas · ` +
              dateLabel(active.submitted_at)
            }
            delay={220}
            numberOfLines={1}
            style={[styles.selectionInfo, { color: colors.muted }]}
          />
        </View>
      </Animated.View>

      <View style={styles.chartWrapper}>
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Defs>
            <LinearGradient id="studyaiArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.008" />
            </LinearGradient>
            <LinearGradient id="studyaiStroke" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={colors.aqua} />
              <Stop offset="100%" stopColor={colors.accent} />
            </LinearGradient>
          </Defs>

          {[100, 50, 0].map((tick) => {
            const y = BOTTOM - (tick / 100) * (BOTTOM - TOP);
            return (
              <G key={tick}>
                <SvgText x={24} y={y + 4} fontSize={10} textAnchor="end" fill={colors.muted}>
                  {tick}
                </SvgText>
                <Line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke={colors.grid} strokeDasharray="3 5" />
              </G>
            );
          })}

          {points.length > 1 && (
            <>
              <AnimatedPath d={areaPath} fill="url(#studyaiArea)" animatedProps={fillProps} />
              <AnimatedPath
                d={curve.path}
                fill="none"
                stroke="url(#studyaiStroke)"
                strokeWidth={3.25}
                strokeLinecap="round"
                strokeDasharray={`${curve.length} ${curve.length}`}
                animatedProps={lineProps}
              />
            </>
          )}

          <AnimatedLine
            animatedProps={guideProps}
            y1={TOP}
            y2={BOTTOM}
            stroke={colors.accent}
            strokeOpacity={0.35}
            strokeDasharray="3 5"
          />

          {points.map((p, index) => (
            <ChartDot key={entries[index].attempt_id} point={p} color={colors.accent} surface={colors.surface} index={index} />
          ))}

          <AnimatedCircle animatedProps={cursorProps} r={12} fill={colors.accent} opacity={0.13} />
          <AnimatedCircle
            animatedProps={cursorProps}
            r={6.1}
            fill={colors.surface}
            stroke={colors.accent}
            strokeWidth={2.6}
          />

          <SvgText x={LEFT} y={153} fill={colors.muted} fontSize={10}>
            Anterior
          </SvgText>
          <SvgText x={RIGHT} y={153} fill={colors.muted} fontSize={10} textAnchor="end">
            Reciente
          </SvgText>
        </Svg>

        <View pointerEvents="box-none" style={styles.touchGrid}>
          {entries.map((entry, index) => {
            const hitWidth =
              entries.length === 1 ? 100 : Math.min(62, Math.max(44, (RIGHT - LEFT) / (entries.length - 1)));
            return (
              <Pressable
                key={entry.attempt_id}
                accessibilityRole="button"
                accessibilityLabel={`${entry.quiz_title}, ${Math.round(entry.score_percent)} por ciento`}
                accessibilityState={{ selected: entry.attempt_id === active.attempt_id }}
                onPress={() => setSelectedId(entry.attempt_id)}
                style={[
                  styles.touchColumn,
                  {
                    left: `${((points[index].x - hitWidth / 2) / WIDTH) * 100}%` as `${number}%`,
                    width: `${(hitWidth / WIDTH) * 100}%` as `${number}%`,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.muted }]}>
        Toca la gráfica para revisar cada intento.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 5 },
  selection: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 50 },
  selectionNumber: { fontSize: 31, lineHeight: 38, fontWeight: "800", letterSpacing: -1.1, fontVariant: ["tabular-nums"] },
  selectionCopy: { flex: 1, minWidth: 0, gap: 3 },
  selectionTitle: { fontSize: 12, fontWeight: "700" },
  selectionInfo: { fontSize: 11, lineHeight: 16 },
  chartWrapper: { position: "relative" },
  touchGrid: { position: "absolute", top: 0, bottom: 12, left: 0, right: 0 },
  touchColumn: { position: "absolute", top: 0, bottom: 0, minWidth: 44 },
  hint: { textAlign: "center", fontSize: 10.5, lineHeight: 16 },
  empty: { minHeight: 155, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, gap: 7 },
  emptyTitle: { fontSize: 14, fontWeight: "700" },
  emptyDescription: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
