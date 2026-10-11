import { useSettings } from "@/hooks/useSettings";
import { SettingsChoice, SettingsPage, SettingsSection } from "@/components/settings/settings-ui";
import { cn } from "@/lib/utils";
import type { Prefs } from "@/lib/settings";

const ACCENTS: { value: Prefs["accent"]; label: string; swatch: string }[] = [
  { value: "mono", label: "Mono", swatch: "bg-foreground" },
  { value: "blue", label: "Blue", swatch: "[background:hsl(217_80%_50%)]" },
  { value: "green", label: "Green", swatch: "[background:hsl(150_60%_36%)]" },
  { value: "orange", label: "Orange", swatch: "[background:hsl(24_90%_48%)]" },
  { value: "rose", label: "Rose", swatch: "[background:hsl(345_75%_50%)]" },
];

export default function Appearance() {
  const { prefs, update, loading } = useSettings();
  return (
    <SettingsPage title="Appearance" loading={loading}>
      <SettingsSection title="Theme">
        <SettingsChoice label="Theme" value={prefs.theme}
          options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          onChange={(v) => update({ theme: v })} />
      </SettingsSection>
      <SettingsSection title="Accent colour" description="Used for main buttons and highlights.">
        <div className="flex items-center gap-3 rounded-full border border-border py-2 pl-5 pr-2"><p className="shrink-0 text-sm font-medium text-foreground">Accent</p><div role="radiogroup" aria-label="Accent colour" className="ml-auto flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ACCENTS.map((a) => (
            <button key={a.value} type="button" role="radio" aria-checked={prefs.accent === a.value} onClick={() => update({ accent: a.value })}
              aria-label={a.label} title={a.label} className="shrink-0 p-1">
              <span className={cn("block w-7 h-7 rounded-full ring-offset-2 ring-offset-background", a.swatch, prefs.accent === a.value && "ring-2 ring-foreground")} />
            </button>
          ))}
        </div></div>
      </SettingsSection>
      <SettingsSection title="Text size">
        <SettingsChoice label="Text size" value={prefs.fontSize}
          options={[{ value: "sm", label: "Small" }, { value: "md", label: "Default" }, { value: "lg", label: "Large" }]}
          onChange={(v) => update({ fontSize: v })} />
      </SettingsSection>
    </SettingsPage>
  );
}
