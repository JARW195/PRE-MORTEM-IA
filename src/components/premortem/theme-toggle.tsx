"use client";

/**
 * ThemeToggle — light/dark switch for PRE-MORTEM IA.
 *
 * Uses `next-themes` `useTheme`. Until the component has mounted on the client
 * we render a static placeholder button to avoid a hydration mismatch (the
 * server has no way to know the resolved theme). After mount we render the
 * Sun/Moon icon matching the *current* theme, and clicking toggles to the
 * other one.
 *
 * Compact: size="sm" and icon-only (no text label) so it fits comfortably in
 * the header bar on mobile and desktop.
 *
 * NOTE: for this component to work, the app must be wrapped in
 * `next-themes`'s `<ThemeProvider attribute="class" defaultTheme="dark" />`
 * (the main agent wires that in `layout.tsx`). Until then, `theme` will be
 * `undefined` and the toggle stays on its placeholder state.
 */

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder — stable on server + first client paint (no theme icon
    // flicker, no hydration warning from `next-themes`).
    return (
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0 text-muted-foreground"
        aria-label="Toggle theme"
        disabled
        type="button"
      >
        <Sun className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-8 p-0 text-muted-foreground hover:text-amber-400"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      {isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
