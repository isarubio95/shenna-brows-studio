import type { SVGProps } from "react";

/** Lucide no trae iconos de marca; SVG local compatible con className/width/height. */
export function TikTokIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M16.6 5.82A6.2 6.2 0 0 1 15.1 2h-3.2v12.36a2.6 2.6 0 1 1-1.86-2.5V8.55a5.9 5.9 0 1 0 5.06 5.84V9.02a8.2 8.2 0 0 0 4.4 1.3V7.1a4.83 4.83 0 0 1-2.9-1.28z" />
    </svg>
  );
}
