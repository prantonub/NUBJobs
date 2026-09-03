import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

const SIZES = { sm: 32, md: 48, lg: 64 } as const;

/**
 * Deterministic fallback tints. Full class strings (not interpolated) so
 * Tailwind's content scanner keeps them in the build.
 */
const FALLBACK_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Company avatar. Renders the logo via next/image when a URL is given,
 * otherwise a colored square with the company's initials (color derived
 * deterministically from the name).
 */
export function CompanyLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: CompanyLogoProps) {
  const px = SIZES[size];
  const radius = size === "sm" ? "rounded-md" : "rounded-lg";

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={px}
        height={px}
        className={cn(
          "shrink-0 bg-white object-contain ring-1 ring-border",
          radius,
          className
        )}
        style={{ width: px, height: px }}
      />
    );
  }

  const textSize =
    size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-lg";

  return (
    <div
      role="img"
      aria-label={`${name} logo`}
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold",
        radius,
        textSize,
        colorFor(name),
        className
      )}
      style={{ width: px, height: px }}
    >
      {getInitials(name)}
    </div>
  );
}
