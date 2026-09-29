import { useMemo } from "react";
import { useSiteContentValue } from "@/hooks/use-site-content";
import { FAQ_CONTENT_KEY, parseFaqConfig } from "@/lib/faq-content";

export function useFaqPageVisible(): boolean {
  const content = useSiteContentValue(FAQ_CONTENT_KEY);
  return useMemo(() => parseFaqConfig(content).pageVisible, [content]);
}
