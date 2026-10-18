import {
  Award,
  BadgeCheck,
  Clock,
  CreditCard,
  Crosshair,
  Droplet,
  Gem,
  Gift,
  Heart,
  Leaf,
  Lock,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkle,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { MarketingIconId } from "@/lib/marketing-icons";

const ICONS: Record<MarketingIconId, LucideIcon> = {
  truck: Truck,
  "package-check": PackageCheck,
  "shield-check": ShieldCheck,
  "message-circle": MessageCircle,
  crosshair: Crosshair,
  heart: Heart,
  leaf: Leaf,
  sparkle: Sparkle,
  sparkles: Sparkles,
  star: Star,
  award: Award,
  clock: Clock,
  gift: Gift,
  "badge-check": BadgeCheck,
  "credit-card": CreditCard,
  lock: Lock,
  gem: Gem,
  droplet: Droplet,
};

const MarketingIcon = ({ id, ...props }: { id: MarketingIconId } & LucideProps) => {
  const Icon = ICONS[id] ?? Sparkle;
  return <Icon aria-hidden strokeWidth={1.5} {...props} />;
};

export default MarketingIcon;
