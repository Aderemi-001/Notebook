"use client";

import * as React from "react";
import { useTheme } from "next-themes";

type Palette = "default" | "palette-1" | "palette-2" | "palette-3";

interface ThemePaletteContextType {
  currentPalette: Palette;
  setPalette: (palette: Palette) => void;
  palettes: { value: Palette; label: string }[];
}

const ThemePaletteContext = React.createContext<ThemePaletteContextType | undefined>(
  undefined,
);

export function ThemePaletteProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [currentPalette, setCurrentPalette] = React.useState<Palette>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("selected-palette") as Palette) || "default";
    }
    return "default";
  });

  const palettes = [
    { value: "default", label: "Default" },
    { value: "palette-1", label: "Palette 1" },
    { value: "palette-2", label: "Palette 2" },
    { value: "palette-3", label: "Palette 3" },
  ];

  React.useEffect(() => {
    const root = window.document.documentElement;
    // Remove all existing palette classes
    palettes.forEach(p => {
      root.classList.remove(`palette-${p.value}-light`);
      root.classList.remove(`palette-${p.value}-dark`);
    });

    // Add the currently selected palette class based on the theme
    if (theme === "dark") {
      root.classList.add(`palette-${currentPalette}-dark`);
    } else {
      root.classList.add(`palette-${currentPalette}-light`);
    }

    localStorage.setItem("selected-palette", currentPalette);
  }, [currentPalette, theme, palettes]);

  const value = React.useMemo(
    () => ({
      currentPalette,
      setPalette: setCurrentPalette,
      palettes,
    }),
    [currentPalette, palettes],
  );

  return (
    <ThemePaletteContext.Provider value={value}>
      {children}
    </ThemePaletteContext.Provider>
  );
}

export function useThemePalette() {
  const context = React.useContext(ThemePaletteContext);
  if (context === undefined) {
    throw new Error("useThemePalette must be used within a ThemePaletteProvider");
  }
  return context;
}