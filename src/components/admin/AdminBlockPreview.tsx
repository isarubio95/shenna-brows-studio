import { useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CampaignPreviewFrame, type CampaignPreviewDevice } from "@/components/CampaignBanner";
import { cn } from "@/lib/utils";

/**
 * Vista previa fiel (390px o 1920px reales, escalados) con selector de
 * dispositivo, como la del código promocional.
 */
const AdminBlockPreview = ({
  children,
  note,
}: {
  children: (device: CampaignPreviewDevice) => ReactNode;
  note?: string;
}) => {
  const [device, setDevice] = useState<CampaignPreviewDevice>("mobile");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-carbon/60 text-xs uppercase tracking-wider">Vista previa</Label>
        <div className="flex rounded-md border border-gold/20 overflow-hidden">
          {(["mobile", "desktop"] as const).map((d) => {
            const Icon = d === "desktop" ? Monitor : Smartphone;
            return (
              <Button
                key={d}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                className={cn(
                  "h-8 gap-1.5 rounded-none px-3 text-xs",
                  device === d ? "bg-gold/15 text-carbon" : "text-carbon/50",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {d === "desktop" ? "Escritorio" : "Móvil"}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="-mx-6 border-y border-carbon/10 overflow-hidden">
        <CampaignPreviewFrame device={device}>
          <div className="site-theme bg-cream">{children(device)}</div>
        </CampaignPreviewFrame>
      </div>
      <p className="text-xs text-carbon/35 mt-2">
        Vista de {device === "mobile" ? "móvil (390px)" : "escritorio (1920px)"}.{note ? ` ${note}` : ""}
      </p>
    </div>
  );
};

export default AdminBlockPreview;
