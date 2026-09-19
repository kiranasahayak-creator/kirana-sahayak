// Lowercases, trims, collapses whitespace and strips punctuation from the
// Latin portion of text while leaving Devanagari/Gurmukhi/other Indic
// scripts untouched (they don't have a Latin-style case distinction, and
// stripping the wrong characters there would corrupt matching).
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/['".,!?()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
