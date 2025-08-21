"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { ThemePaletteProvider } from "./ThemePaletteProvider"; // Import the new provider

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemePaletteProvider> {/* Wrap children with ThemePaletteProvider */}
        {children}
      </ThemePaletteProvider>
    </NextThemesProvider>
  );
}