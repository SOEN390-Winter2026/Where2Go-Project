/**
 * Longest suffix of ASCII digits (0–9) at the end of `s`.
 * Linear-time; no regex (avoids ReDoS concerns on user-controlled floor strings).
 */
export function trailingAsciiDigitSuffix(s) {
  const text = String(s ?? "");
  let i = text.length;
  while (i > 0) {
    const c = text.charCodeAt(i - 1);
    if (c < 48 || c > 57) break;
    i -= 1;
  }
  const tail = text.slice(i);
  return tail.length ? tail : "";
}
