"use client";

import { BriefcaseIcon, Building2Icon, GraduationCapIcon, TrendingUpIcon } from "lucide-react";

import { AnimatedCounter, Stagger, StaggerItem } from "@/components/motion-primitives";

interface Stat {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
}

const STATS: Stat[] = [
  { icon: <BriefcaseIcon />, value: 500, suffix: "+", label: "Jobs Posted" },
  { icon: <Building2Icon />, value: 200, suffix: "+", label: "Companies" },
  { icon: <GraduationCapIcon />, value: 1000, suffix: "+", label: "Students Placed" },
  { icon: <TrendingUpIcon />, value: 95, suffix: "%", label: "Placement Rate" },
];

/**
 * Stats band shown directly under the hero. Each figure counts up the first
 * time it scrolls into view.
 */
export function StatsBar() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Stagger className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((stat) => (
            <StaggerItem
              key={stat.label}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 [&_svg]:size-6 dark:text-brand-100">
                {stat.icon}
              </div>
              <div className="font-heading text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
