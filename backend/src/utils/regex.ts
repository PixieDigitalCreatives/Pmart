export function escapeRegExp(string: string): string {
  // Escapes characters that have special meaning in regular expressions
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
