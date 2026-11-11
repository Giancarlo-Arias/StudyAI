"use client";

import {
  createContext,
  use,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";

type DashboardMotionCycle = { pathname: string | null };
const DashboardMotionContext = createContext<DashboardMotionCycle>({ pathname: null });

export function DashboardMotionScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cycle = useMemo(() => ({ pathname }), [pathname]);
  return <DashboardMotionContext value={cycle}>{children}</DashboardMotionContext>;
}

function useDashboardMotionCycle() {
  const cycle = use(DashboardMotionContext);
  const [ownerPath] = useState(cycle.pathname);
  return ownerPath === cycle.pathname ? cycle : null;
}

function subscribeMotion(listener: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", listener);
  return () => preference.removeEventListener("change", listener);
}

function afterViewTransition(callback: () => void) {
  let cancelled = false;
  let frame = 0;
  const queue = () => {
    if (cancelled) return;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const active = (
          document as Document & { activeViewTransition?: { finished: Promise<unknown> } }
        ).activeViewTransition;
        if (active) {
          void active.finished.then(queue, queue);
          return;
        }
        const snapshots = document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect instanceof KeyframeEffect &&
              animation.effect.pseudoElement?.startsWith("::view-transition"),
          );
        if (snapshots.length) {
          void Promise.allSettled(snapshots.map((animation) => animation.finished)).then(queue);
          return;
        }
        callback();
      });
    });
  };
  queue();
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

export function useDashboardReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function useRevealReady(ref: RefObject<HTMLElement | null>) {
  const reducedMotion = useDashboardReducedMotion();
  const cycle = useDashboardMotionCycle();
  const [readyFor, setReadyFor] = useState<DashboardMotionCycle | null>(null);

  useLayoutEffect(() => {
    if (!cycle || !ref.current?.getClientRects().length) return;
    let cancelled = false;
    let timer = 0;
    const cancel = afterViewTransition(() => {
      const card =
        ref.current?.closest<HTMLElement>("[data-reveal]") ??
        ref.current?.querySelector<HTMLElement>("[data-reveal]");
      const animation = card?.getAnimations()[0];
      const timing = animation?.effect?.getComputedTiming();
      const elapsed = typeof animation?.currentTime === "number" ? animation.currentTime : 0;
      const delay = timing
        ? Math.max(0, Number(timing.delay) + Number(timing.duration) * 0.25 - elapsed)
        : 0;
      timer = window.setTimeout(
        () => {
          if (!cancelled) setReadyFor(cycle);
        },
        reducedMotion ? 0 : delay,
      );
    });
    return () => {
      cancelled = true;
      cancel();
      clearTimeout(timer);
    };
  }, [ref, reducedMotion, cycle]);

  return reducedMotion || !cycle || readyFor === cycle;
}

export function AnimatedMetric({
  value,
  format,
}: {
  value: number | null;
  format: (value: number | null) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const ready = useRevealReady(ref);
  const reducedMotion = useDashboardReducedMotion();
  const cycle = useDashboardMotionCycle();
  const finalValue = format(value);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !cycle || value === null || reducedMotion) return;
    if (!ready) {
      node.textContent = format(0);
      return () => {
        node.textContent = finalValue;
      };
    }
    let frame = 0;
    let start: number | undefined;
    node.textContent = format(0);
    const animate = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / 620);
      node.textContent =
        progress === 1 ? finalValue : format(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      node.textContent = finalValue;
    };
  }, [value, format, finalValue, ready, reducedMotion, cycle]);

  return (
    <span ref={ref} aria-hidden="true">
      {finalValue}
    </span>
  );
}

export function DashboardReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useDashboardReducedMotion();
  const cycle = useDashboardMotionCycle();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      !cycle ||
      !root.getClientRects().length ||
      document.visibilityState === "hidden" ||
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const explicit = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const candidates = Array.from(
      explicit.length ? explicit : root.querySelectorAll<HTMLElement>("header, .workspace-panel"),
    );
    const owned = candidates.filter((element) => element.closest("[data-reveal-root]") === root);
    const elements = owned.filter(
      (element) => !owned.some((parent) => parent !== element && parent.contains(element)),
    );
    const delays = [0, 34, 62, 84, 102, 118, 140, 156, 170];
    const animations = elements.map((element, index) =>
      element.animate(
        [
          {
            opacity: 0,
            transform:
              element.dataset.reveal === "fade"
                ? "none"
                : `translateY(${element.dataset.reveal === "text" ? 12 : 8}px)`,
          },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: element.dataset.reveal === "text" ? 300 : 280,
          delay: delays[Math.min(index, delays.length - 1)],
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
          fill: "backwards",
        },
      ),
    );

    animations.forEach((animation) => animation.pause());
    const cancel = afterViewTransition(() => animations.forEach((animation) => animation.play()));

    return () => {
      cancel();
      animations.forEach((animation) => animation.cancel());
    };
  }, [reducedMotion, cycle]);

  return (
    <div ref={rootRef} data-reveal-root="" className={className}>
      {children}
    </div>
  );
}
