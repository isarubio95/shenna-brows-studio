import { useAnnouncementBar } from "@/hooks/use-announcement-bar";
import { DEFAULT_ANNOUNCEMENT_BAR, type AnnouncementBarConfig } from "@/lib/announcement-content";
import { cn } from "@/lib/utils";

const STRIP_COPIES = 2;
const MIN_LOOP_ITEMS = 8;

function loopItems(items: string[]): string[] {
  const source = items.length > 0 ? items : DEFAULT_ANNOUNCEMENT_BAR.items;
  const repeats = Math.max(1, Math.ceil(MIN_LOOP_ITEMS / source.length));
  return Array.from({ length: repeats }, () => source).flat();
}

export function AnnouncementBarView({
  config,
  preview = false,
}: {
  config: AnnouncementBarConfig;
  preview?: boolean;
}) {
  const items = config.items.length > 0 ? config.items : DEFAULT_ANNOUNCEMENT_BAR.items;
  const strip = loopItems(items);
  const label = items.join(". ");

  if (!config.enabled) {
    return preview ? (
      <div className="rounded-lg border border-dashed border-carbon/15 px-4 py-3 text-xs text-carbon/40">
        Oculta en la web hasta que la actives.
      </div>
    ) : null;
  }

  return (
    <div
      className={cn("announcement-bar relative overflow-hidden", preview && "rounded-lg")}
      style={{
        backgroundColor: config.background,
        color: config.textColor,
      }}
      role="region"
      aria-label={label}
    >
      <div className="hidden px-4 py-2 text-center font-sans text-[0.65rem] font-medium uppercase tracking-[0.22em] motion-reduce:block">
        {label}
      </div>
      <div className="flex w-max animate-announce-marquee motion-reduce:hidden">
        {Array.from({ length: STRIP_COPIES }, (_, copy) => (
          <ul key={copy} className="flex shrink-0 items-center py-2.5" aria-hidden>
            {strip.map((item, index) => (
              <li key={`${copy}-${index}-${item}`} className="flex shrink-0 items-center">
                <span className="whitespace-nowrap px-5 font-sans text-[0.65rem] font-medium uppercase tracking-[0.22em] sm:px-7">
                  {item}
                </span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-55" aria-hidden />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

const AnnouncementBar = () => {
  const config = useAnnouncementBar();
  return <AnnouncementBarView config={config} />;
};

export default AnnouncementBar;
