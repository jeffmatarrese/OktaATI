import { Switch } from '@/components/ui/switch';

interface Props { value: boolean; onChange: (v: boolean) => void; }

export function ShadowAiToggle({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <Switch checked={value} onCheckedChange={onChange} aria-label="Show shadow AI only" />
      Shadow AI only
    </label>
  );
}
