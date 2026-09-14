import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";

import authBackground from "@/bg-image/nub-excuersion.jpg";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-105"
        style={{
          backgroundImage: `url(${authBackground.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          filter: "saturate(1.0) contrast(1.0) brightness(0.82)",
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08))]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-5 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 shadow-lg shadow-slate-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/12"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/20">
              <GraduationCapIcon className="size-5" />
            </span>
            <span className="font-heading text-xl font-bold tracking-tight text-white">
              NUB<span className="text-brand-300">Jobs</span>
            </span>
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(2,6,23,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
          <div className="relative rounded-[23px] bg-white p-5 sm:p-7">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
