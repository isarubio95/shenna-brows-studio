import { useMemo } from "react";
import { useSiteContentValue } from "@/hooks/use-site-content";
import {
  ANNOUNCEMENT_CONTENT_KEY,
  parseAnnouncementBarConfig,
  type AnnouncementBarConfig,
} from "@/lib/announcement-content";

export function useAnnouncementBar(): AnnouncementBarConfig {
  const content = useSiteContentValue(ANNOUNCEMENT_CONTENT_KEY);
  return useMemo(() => parseAnnouncementBarConfig(content), [content]);
}
