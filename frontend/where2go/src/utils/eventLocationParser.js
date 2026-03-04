/**
 * Parses event location strings into { building, room }.
 * Handles "H 435", "Hall Building 435", full addresses, French/English.
 */

// full building name → official code
const BUILDING_NAME_TO_CODE = {
  // SGW
  "hall building": "H",
  "mcconnell building": "JW",
  "visual arts building": "VA",
  "engineering & visual arts": "EV",
  "engineering and visual arts": "EV",
  "grey nuns building": "GN",
  "faubourg building": "FG",
  "cl annex building": "CL",
  "toronto-dominion building": "TD",
  "john molson building": "MB",
  "jmsb": "MB",
  "guy-de maisonneuve building": "GM",
  "learning square building": "LS",
  "er building": "ER",
  "gs building": "GS",
  "samuel bronfman building": "SB",
  "q annex": "Q",
  "p annex": "P",
  "t annex": "T",
  "rr annex": "RR",
  "r annex": "R",
  "fa annex": "FA",
  "en annex": "EN",
  "x annex": "X",
  "z annex": "Z",
  "pr annex": "PR",
  "v annex": "V",
  "m annex": "M",
  "s annex": "S",
  "ci annex": "CI",
  "mi annex": "MI",
  "d annex": "D",
  "b annex": "B",
  "k annex": "K",
  "mu annex": "MU",
  // Loyola
  "stinger dome": "DO",
  "perform centre": "PC",
  "recreation and athletics complex": "RA",
  "centre for structural and functional genomics": "GE",
  "communication studies and journalism building": "CJ",
  "communications studies and journalism building": "CJ",
  "richard j. renaud science complex": "SP",
  "administration building": "AD",
  "central building": "CC",
  "loyola jesuit hall and conference centre": "RF",
  "f.c. smith building": "FC",
  "fc smith building": "FC",
  "quadrangle": "QA",
  "psychology building": "PY",
  "vanier extension": "VE",
  "vanier library building": "VL",
  "oscar peterson concert hall": "PT",
  "student centre": "SC",
  "bh annex": "BH",
  "bb annex": "BB",
  "physical services building": "PS",
  "st. ignatius of loyola church": "SI",
  "jesuit residence": "JR",
  "applied science hub": "HU",
  "future buildings laboratory": "SH",
  "terrebonne building": "TA",
  "terrebone building": "TA",
};

const KNOWN_CODES = new Set([
  "H", "JW", "VA", "EV", "GN", "FG", "CL", "TD", "MB", "GM", "LS", "ER", "GS", "SB",
  "Q", "P", "T", "RR", "R", "FA", "EN", "X", "Z", "PR", "V", "M", "S", "CI", "MI", "D", "B", "K", "MU",
  "DO", "PC", "RA", "GE", "CJ", "SP", "AD", "CC", "RF", "FC", "QA", "PY", "VE", "VL", "PT", "SC",
  "BH", "BB", "PS", "SI", "JR", "HU", "HA", "HB", "HC", "SH", "TA",
]);

// number + street → building code (for full-address pastes)
const ADDRESS_TO_CODE = {
  "1455 de maisonneuve": "H",
  "1400 de maisonneuve": "JW",
  "1395 rene-levesque": "VA",
  "1515 ste-catherine": "EV",
  "1190 guy": "GN",
  "1250 guy": "FG",
  "1665 ste-catherine": "CL",
  "1616 ste-catherine": "TD",
  "1450 guy": "MB",
  "1550 de maisonneuve": "GM",
  "1535 de maisonneuve": "LS",
  "2155 guy": "ER",
  "1538 sherbrooke": "GS",
  "1590 docteur penfield": "SB",
  "2010 mackay": "Q",
  "2020 mackay": "P",
  "2030 mackay": "T",
  "2040 mackay": "RR",
  "2050 mackay": "R",
  "2060 mackay": "FA",
  "2070 mackay": "EN",
  "2080 mackay": "X",
  "2090 mackay": "Z",
  "2100 mackay": "PR",
  "2110 mackay": "V",
  "2135 mackay": "M",
  "2145 mackay": "S",
  "2149 mackay": "CI",
  "2130 bishop": "MI",
  "2140 bishop": "D",
  "2160 bishop": "B",
  "2150 bishop": "K",
  "2170 bishop": "MU",
  "7141 sherbrooke": "AD",
  "7200 sherbrooke": "PC",
  "3500 belmore": "BH",
  "3502 belmore": "BB",
  "4455 broadway": "SI",
  "7079 terrebonne": "TA",
};

const ADDRESS_KEYS = Object.keys(ADDRESS_TO_CODE);

/**
 * Returns { building, room }. Either can be null if we could not parse it.
 */
export function parseEventLocation(location) {
  if (!location || typeof location !== "string") {
    return { building: null, room: null };
  }

  const s = location.trim();

  // if it's already formatted as "H 435" or "EV-213"
  const codeRoom = s.match(/^([A-Z]{1,3})[- ]*(\d{2,4}[A-Z]?(?:\.[-]?\d+)?)$/i);
  if (codeRoom && KNOWN_CODES.has(codeRoom[1].toUpperCase())) {
    return { building: codeRoom[1].toUpperCase(), room: codeRoom[2] };
  }

  // pull room from end if present
  const roomMatch = s.match(/(\d{2,4}[A-Z]?(?:\.[-]?\d+)?)\s*$/);
  const room = roomMatch ? roomMatch[1] : null;
  let buildingPart = roomMatch ? s.slice(0, roomMatch.index) : s;

  // strip ", Room 435", "(SGW)", etc. — use simple patterns to avoid ReDoS
  buildingPart = buildingPart
    .replace(/,?[ \t]*room[ \t:]*$/gi, "")
    .replace(/,?[ \t]*salle[ \t:]*$/gi, "")
    .replace(/,?[ \t]*rm\.?[ \t:]*$/gi, "")
    .replace(/[ \t]*\(SGW\)/gi, "")
    .replace(/[ \t]*\(Loyola\)/gi, "")
    .trim();

  // try whole string as name or code
  let code = BUILDING_NAME_TO_CODE[buildingPart.toLowerCase()];
  if (!code) {
    code = KNOWN_CODES.has(buildingPart.toUpperCase()) ? buildingPart.toUpperCase() : null;
  }

  // try each line or comma-separated chunk
  if (!code) {
    const parts = buildingPart.split(/\n|,/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      code = BUILDING_NAME_TO_CODE[part.toLowerCase()] ||
        (KNOWN_CODES.has(part.toUpperCase()) ? part.toUpperCase() : null);
      if (code) break;
    }
  }

  // last resort: match as address (French or English)
  if (!code) {
    const normalized = s
      .toLowerCase()
      .replace(/[.,]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b(boulevard|blvd\.?|street|st\.?|avenue|ave\.?|av\.?)\s*(ouest|west|w\.?)?\s*/gi, " ")
      .replace(/\b(ouest|west)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const matched = ADDRESS_KEYS
      .filter((k) => normalized.includes(k))
      .sort((a, b) => b.length - a.length)[0];
    if (matched) {
      code = ADDRESS_TO_CODE[matched];
    }
  }

  return { building: code, room };
}
