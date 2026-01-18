import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor="theme-toggle" className="text-base">{t('settings.appearance.darkMode')}</Label>
        <p className="text-sm text-muted-foreground">{t('settings.appearance.darkModeDesc')}</p>
      </div>
      <Switch
        id="theme-toggle"
        checked={theme === "dark"}
        onCheckedChange={handleThemeToggle}
      />
    </div>
  );
}