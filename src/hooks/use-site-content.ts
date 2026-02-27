import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteContent {
  key: string;
  title: string;
  content: string;
}

export function useSiteContent(keys: string[]) {
  const [data, setData] = useState<Record<string, SiteContent>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any)
      .from("site_content")
      .select("key, title, content")
      .in("key", keys)
      .then(({ data: rows }: any) => {
        if (rows) {
          const map: Record<string, SiteContent> = {};
          rows.forEach((r: SiteContent) => { map[r.key] = r; });
          setData(map);
        }
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
