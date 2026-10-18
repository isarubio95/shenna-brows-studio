import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MarketingIcon from "@/components/MarketingIcon";
import {
  MARKETING_ICON_IDS,
  MARKETING_ICON_LABELS,
  type MarketingIconId,
} from "@/lib/marketing-icons";

const AdminMarketingIconSelect = ({
  value,
  onChange,
  ariaLabel,
}: {
  value: MarketingIconId;
  onChange: (icon: MarketingIconId) => void;
  ariaLabel: string;
}) => (
  <Select value={value} onValueChange={(next) => onChange(next as MarketingIconId)}>
    <SelectTrigger aria-label={ariaLabel} className="mt-1 border-gold/20 focus:ring-gold/30">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {MARKETING_ICON_IDS.map((id) => (
        <SelectItem key={id} value={id}>
          <span className="flex items-center gap-2">
            <MarketingIcon id={id} className="h-4 w-4 text-gold" />
            {MARKETING_ICON_LABELS[id]}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default AdminMarketingIconSelect;
