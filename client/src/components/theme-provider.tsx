"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Thin wrapper around next-themes' provider so the root layout (a Server
 * Component) can mount theme support. `attribute="class"` toggles the `.dark`
 * class on <html>, which drives the shadcn/ui dark tokens in globals.css.
 *
 * Why the pre-paint bootstrap is injected here instead of trusting
 * next-themes' own script: React 19 never executes a <script> that a
 * component renders on the client. It logs
 *
 *   Encountered a script tag while rendering React component. Scripts inside
 *   React components are never executed when rendering on the client.
 *
 * and leaves the tag inert. next-themes renders its script inside a Client
 * Component, so whenever React builds the tree on the client instead of
 * hydrating it (hydration recovery after a mismatch, a Fast Refresh remount,
 * …) that error fired — and the script did nothing, flashing the wrong theme.
 *
 * This module therefore does two things:
 *   1. flushes an equivalent bootstrap into the SSR stream with
 *      `useServerInsertedHTML`. It is raw HTML outside React's element tree
 *      (the hook is a no-op on the client), so React never owns a script, and
 *      the bootstrap has already run before first paint however React renders
 *      afterwards.
 *   2. marks next-themes' own script as a data block (`type: "text/plain"`),
 *      which React classifies as inert content and therefore never warns
 *      about. It remains in the markup, but it is the bootstrap above that
 *      does the work.
 */

interface ThemeBootstrapConfig {
  attribute: string | string[];
  storageKey: string;
  defaultTheme: string;
  forcedTheme: string | null;
  themes: string[];
  value: Record<string, string> | null;
  enableSystem: boolean;
  enableColorScheme: boolean;
}

/**
 * The pre-paint script: resolves the stored (or system) theme and applies it
 * to <html>. It mirrors next-themes' own bootstrap, so the class its client
 * effects apply a moment later is always the same one.
 */
function buildThemeBootstrap(config: ThemeBootstrapConfig): string {
  // A literal "<" would close the inline script early, so never inline it.
  const payload = JSON.stringify(config).replace(/</g, "\\u003c");

  return `(function (c) {
    try {
      var d = document.documentElement;
      var stored = c.forcedTheme || window.localStorage.getItem(c.storageKey) || c.defaultTheme;
      var theme = c.enableSystem && stored === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : stored;
      var mapped = c.value && c.value[theme] ? c.value[theme] : theme;
      var attributes = Array.isArray(c.attribute) ? c.attribute : [c.attribute];
      for (var i = 0; i < attributes.length; i++) {
        if (attributes[i] === "class") {
          var known = c.value
            ? c.themes.map(function (t) { return c.value[t] || t; })
            : c.themes;
          d.classList.remove.apply(d.classList, known);
          d.classList.add(mapped);
        } else {
          d.setAttribute(attributes[i], mapped);
        }
      }
      if (c.enableColorScheme && ["light", "dark"].indexOf(theme) !== -1) {
        d.style.colorScheme = theme;
      }
    } catch (e) {}
  })(${payload});`;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = ["light", "dark"],
  forcedTheme,
  value,
  nonce,
  scriptProps,
  disableTransitionOnChange,
  ...rest
}: React.ComponentProps<typeof NextThemesProvider>) {
  const bootstrap = buildThemeBootstrap({
    attribute,
    storageKey,
    defaultTheme,
    forcedTheme: forcedTheme ?? null,
    themes,
    value: value ?? null,
    enableSystem,
    enableColorScheme,
  });

  // `useServerInsertedHTML` collects a callback for every render the provider
  // performs while streaming, so only the first callback may emit the script —
  // otherwise the bootstrap would land in the document once per render.
  const bootstrapEmitted = React.useRef(false);

  // Runs while rendering on the server: Next flushes the returned markup into
  // the HTML stream, outside React's tree. On the client the hook is a no-op.
  useServerInsertedHTML(() => {
    if (bootstrapEmitted.current) return null;
    bootstrapEmitted.current = true;
    return (
      <script
        key="nubjobs-theme-bootstrap"
        data-nubjobs-theme-bootstrap
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: bootstrap }}
      />
    );
  });

  return (
    <NextThemesProvider
      {...rest}
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      enableColorScheme={enableColorScheme}
      storageKey={storageKey}
      themes={themes}
      forcedTheme={forcedTheme}
      value={value}
      nonce={nonce}
      disableTransitionOnChange={disableTransitionOnChange}
      // `type` is deliberately last: it marks the script inert for React
      // (see the note above) whatever else a caller passes through.
      scriptProps={{ ...scriptProps, type: "text/plain" }}
    >
      {children}
    </NextThemesProvider>
  );
}
