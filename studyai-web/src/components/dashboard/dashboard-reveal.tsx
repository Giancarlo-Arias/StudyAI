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
    const cancel = afterViewTransition(() => {
      const node = ref.current;
      const card = node?.closest<HTMLElement>(".workspace-panel, [data-reveal]");
      const cards = card
        ? [card]
        : Array.from(node?.querySelectorAll<HTMLElement>('[data-reveal="container"]') ?? []);
      const animations = cards.flatMap((element) => element.getAnimations());
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (!cancelled) setReadyFor(cycle);
      });
    });
    return () => {
      cancelled = true;
      cancel();
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
  containerEntrance = false,
}: {
  children: ReactNode;
  className?: string;
  containerEntrance?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useDashboardReducedMotion();
  const cycle = useDashboardMotionCycle();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (
      !cycle ||
      !root.getClientRects().length ||
      document.visibilityState === "hidden" ||
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      if (containerEntrance) root.dataset.containerEntrance = "ready";
      return;
    }

    const owns = (element: HTMLElement) => element.closest("[data-reveal-root]") === root;
    const explicit = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(owns);
    const owned = explicit.length
      ? explicit
      : Array.from(root.querySelectorAll<HTMLElement>("header, .workspace-panel")).filter(owns);
    const elements = owned.filter(
      (element) => !owned.some((parent) => parent !== element && parent.contains(element)),
    );
    const delays = containerEntrance ? [0, 70, 120, 160] : [0, 34, 62, 84, 102, 118, 140, 156, 170];
    const contentAnimations: Animation[] = [];
    const animations = elements.map((element, index) => {
      const isContainer = containerEntrance && element.classList.contains("workspace-panel");
      const duration = isContainer ? 760 : element.dataset.reveal === "text" ? 420 : 280;
      const delay = delays[Math.min(index, delays.length - 1)];
      if (isContainer) {
        const specified = Array.from(
          element.querySelectorAll<HTMLElement>("[data-reveal-content]"),
        ).filter((child) => child.closest(".workspace-panel") === element);
        (specified.length ? specified : Array.from(element.children))
          .filter((child): child is HTMLElement => child instanceof HTMLElement)
          .forEach((child, childIndex) => {
            const animation = child.animate(
              [
                { opacity: 0, transform: "translateY(10px)" },
                { opacity: 1, transform: "none" },
              ],
              {
                duration: 380,
                delay: delay + duration + [0, 55, 100, 135, 165, 185][Math.min(childIndex, 5)],
                easing: "cubic-bezier(0.23, 1, 0.32, 1)",
                fill: "backwards",
              },
            );
            animation.pause();
            contentAnimations.push(animation);
          });
      }
      return element.animate(
        [
          {
            opacity: 0,
            transform: isContainer
              ? "scale(0.45)"
              : element.dataset.reveal === "fade"
                ? "none"
                : `translateY(${element.dataset.reveal === "text" ? 12 : 8}px)`,
          },
          { opacity: 1, transform: isContainer ? "scale(1)" : "translateY(0)" },
        ],
        {
          duration,
          delay,
          easing: isContainer ? "cubic-bezier(0.32, 0.72, 0, 1)" : "cubic-bezier(0.23, 1, 0.32, 1)",
          fill: "backwards",
        },
      );
    });
    animations.push(...contentAnimations);

    animations.forEach((animation) => animation.pause());
    if (containerEntrance) root.dataset.containerEntrance = "ready";
    const cancel = afterViewTransition(() => animations.forEach((animation) => animation.play()));

    return () => {
      cancel();
      animations.forEach((animation) => animation.cancel());
    };
  }, [reducedMotion, cycle, containerEntrance]);

  return (
    <div
      ref={rootRef}
      data-reveal-root=""
      data-container-entrance={containerEntrance ? "pending" : undefined}
      className={className}
    >
      {containerEntrance && (
        <noscript>
          <style>
            {
              '[data-container-entrance="pending"] .workspace-panel, [data-container-entrance="pending"] [data-reveal="text"] { opacity: 1 !important; transform: none !important; }'
            }
          </style>
        </noscript>
      )}
      {children}
    </div>
  );
}
