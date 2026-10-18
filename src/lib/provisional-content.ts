/**
 * Textos puestos a la espera del contenido definitivo de la clienta. La web los
 * muestra con normalidad; el panel los marca en ámbar mientras no se cambien.
 */
export function isProvisionalText(value: string, provisional: string): boolean {
  return value.trim() === provisional.trim();
}
