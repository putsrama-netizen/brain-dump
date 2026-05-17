import {
  Leaf,
  Droplet,
  Heart,
  Pill,
  BookOpen,
  Sun,
  Moon,
  Coffee,
  Footprints,
  Dumbbell,
  Wind,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

export type RitualIconDef = {
  name: string;
  Icon: LucideIcon;
};

export const RITUAL_ICONS: readonly RitualIconDef[] = [
  { name: 'leaf', Icon: Leaf },
  { name: 'droplet', Icon: Droplet },
  { name: 'heart', Icon: Heart },
  { name: 'pill', Icon: Pill },
  { name: 'book', Icon: BookOpen },
  { name: 'sun', Icon: Sun },
  { name: 'moon', Icon: Moon },
  { name: 'coffee', Icon: Coffee },
  { name: 'footprints', Icon: Footprints },
  { name: 'dumbbell', Icon: Dumbbell },
  { name: 'wind', Icon: Wind },
  { name: 'sparkles', Icon: Sparkles },
] as const;

export function getIconComponent(name: string): LucideIcon {
  return RITUAL_ICONS.find((i) => i.name === name)?.Icon ?? Leaf;
}
