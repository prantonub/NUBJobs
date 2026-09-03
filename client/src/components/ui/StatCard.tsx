"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatColor = "blue" | "green" | "amber" | "purple";

const COLOR_STYLES: Record<StatColor, string> = {
  blue: "bg-brand-500/10 text-brand-600 dark:text-brand-100",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

/**
 * Count-up from 0 → target. Hydration-safe: server and client both first render
 * 0, then the effect animates on the client only.
 */
function useCountUp(target: number, enabled: boolean, durationMs = 1200) {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);

  return display;
}

export interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  trend?: { value: number; isUp: boolean };
  color?: StatColor;
  className?: string;
}

/**
 * Dashboard metric tile: colored icon chip, animated value, label, and an
 * optional trend indicator.
 */
export function StatCard({
  icon,
  value,
  label,
  trend,
  color = "blue",
  className,
}: StatCardProps) {
  const isNumeric = typeof value === "number";
  const animated = useCountUp(isNumeric ? value : 0, isNumeric);
  const display = isNumeric ? animated.toLocaleString("en-US") : value;

  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl [&_svg]:size-6",
            COLOR_STYLES[color]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {display}
            </span>
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  trend.isUp
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isUp ? (
                  <ArrowUpIcon className="size-3" />
                ) : (
                  <ArrowDownIcon className="size-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
