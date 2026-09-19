// Deterministic parsing of a speech transcript into (quantity, product phrase)
// segments. Runs BEFORE product matching, so it only has to be "good enough"
// — fuzzy/alias matching downstream absorbs a lot of its imperfection.
//
// Deliberately not an LLM call: this needs to run on every voice utterance,
// fast and free, and small number/connector-word dictionaries cover the
// realistic range of what a shopkeeper says ("2 blue lays aur 3 coke").

export interface ParsedSegment {
  rawText: string; // the product phrase, e.g. "blue lays"
  quantity: number;
}

// Connector words that separate multiple items in one utterance.
const CONNECTORS = [
  "aur",
  "और",
  "ਤੇ",
  "ਅਤੇ",
  "and",
  "&",
  ",",
];

// Small number-word dictionary. Covers 1-20 in English, Hindi (Latin +
// Devanagari) and Punjabi (Latin + Gurmukhi) — realistic for shop order
// quantities. Digits (2, 3, 10...) are handled separately by regex and take
// priority since they're unambiguous.
const NUMBER_WORDS: Record<string, number> = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
  // Hindi (roman)
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6,
  che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  // Hindi (Devanagari)
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6,
  "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
  // Punjabi (roman)
  ikk: 1, do_pa: 2, tinn: 3, char_pa: 4, panj: 5, che_pa: 6, satt: 7,
  att: 8, nau_pa: 9, dass: 10,
  // Punjabi (Gurmukhi)
  "ਇੱਕ": 1, "ਦੋ": 2, "ਤਿੰਨ": 3, "ਚਾਰ": 4, "ਪੰਜ": 5, "ਛੇ": 6, "ਸੱਤ": 7,
  "ਅੱਠ": 8, "ਨੌਂ": 9, "ਦਸ": 10,
};

function buildConnectorRegex(): RegExp {
  const escaped = CONNECTORS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\s+(?:${escaped.join("|")})\\s+|\\s*,\\s*`, "giu");
}

/**
 * Splits a transcript into rough per-item chunks on connector words, then
 * pulls a leading quantity (digit or number word) off each chunk.
 *
 * "2 blue lays aur 3 coke" -> [{quantity:2, rawText:"blue lays"}, {quantity:3, rawText:"coke"}]
 */
export function parseTranscript(transcript: string): ParsedSegment[] {
  const cleaned = transcript.trim();
  if (!cleaned) return [];

  const chunks = cleaned
    .split(buildConnectorRegex())
    .map((c) => c.trim())
    .filter(Boolean);

  const segments: ParsedSegment[] = [];

  for (const chunk of chunks) {
    const words = chunk.split(/\s+/);
    let quantity = 1; // default: shopkeeper often omits "1" ("coke" == 1 coke)
    let startIndex = 0;

    const first = words[0]?.toLowerCase();
    const digitMatch = first?.match(/^(\d+)$/);

    if (digitMatch) {
      quantity = parseInt(digitMatch[1], 10);
      startIndex = 1;
    } else if (first && NUMBER_WORDS[first] !== undefined) {
      quantity = NUMBER_WORDS[first];
      startIndex = 1;
    } else if (first && NUMBER_WORDS[words[0]] !== undefined) {
      // exact-cased match (covers Devanagari/Gurmukhi where lowercasing is a no-op anyway)
      quantity = NUMBER_WORDS[words[0]];
      startIndex = 1;
    }

    const rawText = words.slice(startIndex).join(" ").trim();
    if (rawText) {
      segments.push({ rawText, quantity: Math.max(1, quantity) });
    }
  }

  return segments;
}
