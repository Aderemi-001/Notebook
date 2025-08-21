"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemePalette } from "./ThemePaletteProvider"; // Import the new hook

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { currentPalette, setPalette, palettes } = useThemePalette();

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const handlePaletteChange = (value: string) => {
    setPalette(value as "default" | "palette-1" | "palette-2" | "palette-3");
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="theme-toggle" className="text-base">Dark Mode</Label>
          <p className="text-sm text-muted-foreground">Toggle between light and dark themes.</p>
        </div>
        <Switch
          id="theme-toggle"
          checked={theme === "dark"}
          onCheckedChange={handleThemeToggle}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="palette-select" className="text-base">Color Theme</Label>
          <p className="text-sm text-muted-foreground">Choose a different color scheme.</p>
        </div>
        <Select onValueChange={handlePaletteChange} value={currentPalette}>
          <SelectTrigger id="palette-select" className="w-[180px]">
            <SelectValue placeholder="Select a palette" />
          </SelectTrigger>
          <SelectContent>
            {palettes.map((palette) => (
              <SelectItem key={palette.value} value={palette.value}>
                {palette.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}