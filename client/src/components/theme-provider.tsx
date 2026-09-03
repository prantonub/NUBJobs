"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Thin wrapper around next-themes' provider so the root layout (a Server
 * Component) can mount theme support. `attribute="class"` toggles the `.dark`
 * class on <html>, which drives the shadcn/ui dark tokens in globals.css.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
