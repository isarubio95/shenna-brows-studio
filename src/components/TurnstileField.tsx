import Turnstile from "react-turnstile";
import type { BoundTurnstileObject } from "react-turnstile";

type TurnstileFieldProps = {
  siteKey: string;
  className?: string;
  onVerify: (token: string, bound: BoundTurnstileObject) => void;
  onExpire?: () => void;
  onError?: (bound?: BoundTurnstileObject) => void;
};

/**
 * Contenedor del widget Cloudflare Turnstile optimizado para móvil:
 * tamaño fijo, área táctil mínima y sin depender de `size="flexible"`.
 */
export function TurnstileField({ siteKey, className, onVerify, onExpire, onError }: TurnstileFieldProps) {
  return (
    <div
      className={`relative z-10 w-full min-h-[70px] touch-manipulation overflow-visible isolate ${className ?? ""}`}
    >
      <Turnstile
        sitekey={siteKey}
        fixedSize
        size="normal"
        theme="light"
        onVerify={onVerify}
        onExpire={() => onExpire?.()}
        onError={(_error, bound) => {
          bound?.reset();
          onError?.(bound);
        }}
      />
    </div>
  );
}
