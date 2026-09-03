"use client";

import * as React from "react";
import { motion, useInView, type Variants } from "framer-motion";

/**
 * Reusable Framer Motion helpers for the marketing pages.
 *
 * All exports are client components (framer-motion needs the browser). They are
 * intentionally small and prop-driven so server components (e.g. the homepage)
 * can compose them without pulling their own trees into the client bundle.
 */

const EASE = "easeOut" as const;

/* ── Reveal: fade + rise when scrolled into view ──────────────────────────── */

export interface RevealProps {
  children: React.ReactNode;
  /** Seconds to wait before animating (useful for manual sequencing). */
  delay?: number;
  /** Initial vertical offset in pixels. */
  y?: number;
  /** Animate every time it enters the viewport, or only once. */
  once?: boolean;
  /** Play immediately on mount instead of waiting for the viewport. */
  animateOnMount?: boolean;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "span" | "li";
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  once = true,
  animateOnMount = false,
  duration = 0.5,
  className,
  as = "div",
}: RevealProps) {
  const MotionTag = motion[as];
  const animateProps = animateOnMount
    ? { animate: { opacity: 1, y: 0 } }
    : {
        whileInView: { opacity: 1, y: 0 },
        viewport: { once, margin: "-80px" },
      };

  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
      {...animateProps}
    >
      {children}
    </MotionTag>
  );
}

/* ── Stagger: container that reveals its children in sequence ──────────────── */

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
}

export function Stagger({ children, className, once = true }: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── AnimatedCounter: counts up from 0 → value when it enters the viewport ─── */

export interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  durationMs = 1600,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, durationMs]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
