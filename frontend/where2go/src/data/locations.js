/**
 * Concordia campus and building location data.
 *
 * KNOWN_LOCATIONS  – campus-level coordinates (used by App.js, OutdoorDirection props, etc.)
 * SEARCHABLE_LOCATIONS – flat list of every campus + building with a searchText field
 *                        for case-insensitive autocomplete in the route planner.
 *
 * Building centroids were computed from the polygon data in backend/src/services/map.js.
 * If a building is added/removed there, update this file to match.
 */

// ── Campus coordinates ──────────────────────────────────────────────────────
export const KNOWN_LOCATIONS = {
  SGW: { label: "SGW Campus", lat: 45.4974, lng: -73.5771 },
  Loyola: { label: "Loyola Campus", lat: 45.4587, lng: -73.6409 },
};

// ── Searchable catalogue (campuses + all buildings) ─────────────────────────
// Each entry: { label, lat, lng, searchText }
//   • label      – displayed in dropdown & stored in state after selection
//   • lat / lng  – centroid of the building polygon (or campus centre)
//   • searchText – lowercase tokens used for case-insensitive matching
export const SEARCHABLE_LOCATIONS = [
  // ── Campuses ──
  { label: "SGW Campus", lat: 45.4974, lng: -73.5771, searchText: "sgw campus sir george williams downtown" },
  { label: "Loyola Campus", lat: 45.4587, lng: -73.6409, searchText: "loyola campus" },

  // ── SGW Buildings ──
  { label: "Hall Building (SGW)", lat: 45.49728, lng: -73.57896, searchText: "hall building hall h sgw" },
  { label: "McConnell Building (SGW)", lat: 45.49679, lng: -73.57788, searchText: "mcconnell building jw sgw" },
  { label: "Visual Arts Building (SGW)", lat: 45.49578, lng: -73.57377, searchText: "visual arts building va sgw" },
  { label: "Engineering & Visual Arts (SGW)", lat: 45.49554, lng: -73.57818, searchText: "engineering visual arts ev sgw" },
  { label: "Grey Nuns Building (SGW)", lat: 45.49354, lng: -73.57684, searchText: "grey nuns building gn sgw" },
  { label: "Faubourg Building (SGW)", lat: 45.49424, lng: -73.57825, searchText: "faubourg building fg sgw" },
  { label: "CL Annex Building (SGW)", lat: 45.49419, lng: -73.57931, searchText: "cl annex building cl sgw" },
  { label: "Toronto-Dominion Building (SGW)", lat: 45.49487, lng: -73.57849, searchText: "toronto-dominion building td sgw" },
  { label: "John Molson Building (SGW)", lat: 45.49531, lng: -73.57902, searchText: "john molson building mb jmsb sgw" },
  { label: "Guy-De Maisonneuve Building (SGW)", lat: 45.49586, lng: -73.5788, searchText: "guy-de maisonneuve building gm sgw" },
  { label: "Learning Square Building (SGW)", lat: 45.49634, lng: -73.57951, searchText: "learning square building ls sgw" },
  { label: "ER Building (SGW)", lat: 45.4964, lng: -73.58005, searchText: "er building er sgw" },
  { label: "GS Building (SGW)", lat: 45.49658, lng: -73.58112, searchText: "gs building gs sgw" },
  { label: "Samuel Bronfman Building (SGW)", lat: 45.49654, lng: -73.58604, searchText: "samuel bronfman building sb sgw" },
  { label: "Q Annex (SGW)", lat: 45.49661, lng: -73.5791, searchText: "q annex q sgw" },
  { label: "P Annex (SGW)", lat: 45.49665, lng: -73.57916, searchText: "p annex p sgw" },
  { label: "T Annex (SGW)", lat: 45.49669, lng: -73.57928, searchText: "t annex t sgw" },
  { label: "RR Annex (SGW)", lat: 45.49671, lng: -73.57936, searchText: "rr annex rr sgw" },
  { label: "R Annex (SGW)", lat: 45.49675, lng: -73.57943, searchText: "r annex r sgw" },
  { label: "FA Annex (SGW)", lat: 45.49677, lng: -73.57948, searchText: "fa annex fa sgw" },
  { label: "EN Annex (SGW)", lat: 45.4968, lng: -73.57963, searchText: "en annex en sgw" },
  { label: "X Annex (SGW)", lat: 45.49688, lng: -73.57967, searchText: "x annex x sgw" },
  { label: "Z Annex (SGW)", lat: 45.49692, lng: -73.57975, searchText: "z annex z sgw" },
  { label: "PR Annex (SGW)", lat: 45.49701, lng: -73.57991, searchText: "pr annex pr sgw" },
  { label: "V Annex (SGW)", lat: 45.49703, lng: -73.57995, searchText: "v annex v sgw" },
  { label: "M Annex (SGW)", lat: 45.49761, lng: -73.58002, searchText: "m annex m sgw" },
  { label: "S Annex (SGW)", lat: 45.49766, lng: -73.58017, searchText: "s annex s sgw" },
  { label: "CI Annex (SGW)", lat: 45.49771, lng: -73.58029, searchText: "ci annex ci sgw" },
  { label: "MI Annex (SGW)", lat: 45.49771, lng: -73.57928, searchText: "mi annex mi sgw" },
  { label: "D Annex (SGW)", lat: 45.49778, lng: -73.57932, searchText: "d annex d sgw" },
  { label: "B Annex (SGW)", lat: 45.4978, lng: -73.5795, searchText: "b annex b sgw" },
  { label: "K Annex (SGW)", lat: 45.49782, lng: -73.57953, searchText: "k annex k sgw" },
  { label: "MU Annex (SGW)", lat: 45.49786, lng: -73.5796, searchText: "mu annex mu sgw" },

  // ── Loyola Buildings ──
  { label: "Stinger Dome Building (Loyola)", lat: 45.45766, lng: -73.63616, searchText: "stinger dome building do loyola" },
  { label: "PERFORM Center (Loyola)", lat: 45.45698, lng: -73.63731, searchText: "perform center pc loyola" },
  { label: "Recreation and Athletics Complex (Loyola)", lat: 45.45669, lng: -73.63768, searchText: "recreation athletics complex ra loyola" },
  { label: "Centre for Structural and Functional Genomics (Loyola)", lat: 45.45699, lng: -73.64045, searchText: "centre structural functional genomics ge loyola" },
  { label: "Communications Studies and Journalism Building (Loyola)", lat: 45.45742, lng: -73.6402, searchText: "communications studies journalism building cj loyola" },
  { label: "Richard J. Renaud Science Complex (Loyola)", lat: 45.45782, lng: -73.64154, searchText: "richard renaud science complex sp loyola" },
  { label: "Administration Building (Loyola)", lat: 45.45809, lng: -73.63979, searchText: "administration building ad loyola" },
  { label: "Central Building (Loyola)", lat: 45.4583, lng: -73.64034, searchText: "central building cc loyola" },
  { label: "Loyola Jesuit Hall and Conference Centre (Loyola)", lat: 45.45857, lng: -73.64103, searchText: "loyola jesuit hall conference centre rf loyola" },
  { label: "F.C Smith Building (Loyola)", lat: 45.45858, lng: -73.63933, searchText: "fc smith building fc loyola" },
  { label: "Quadrangle (Loyola)", lat: 45.45875, lng: -73.64001, searchText: "quadrangle qa loyola" },
  { label: "Psychology Building (Loyola)", lat: 45.45893, lng: -73.64049, searchText: "psychology building py loyola" },
  { label: "Vanier Extension (Loyola)", lat: 45.45884, lng: -73.63865, searchText: "vanier extension ve loyola" },
  { label: "Vanier Library Building (Loyola)", lat: 45.45905, lng: -73.63842, searchText: "vanier library building vl loyola" },
  { label: "Oscar Peterson Concert Hall (Loyola)", lat: 45.45932, lng: -73.63896, searchText: "oscar peterson concert hall pt loyola" },
  { label: "Student Centre (Loyola)", lat: 45.45915, lng: -73.63922, searchText: "student centre sc loyola" },
  { label: "BH Annex (Loyola)", lat: 45.45972, lng: -73.63909, searchText: "bh annex bh loyola" },
  { label: "BB Annex (Loyola)", lat: 45.45976, lng: -73.63917, searchText: "bb annex bb loyola" },
  { label: "Physical Services Building (Loyola)", lat: 45.45969, lng: -73.63981, searchText: "physical services building ps loyola" },
  { label: "St. Ignatius of Loyola Church (Loyola)", lat: 45.45784, lng: -73.64239, searchText: "st ignatius loyola church si loyola" },
  { label: "Jesuit Residence (Loyola)", lat: 45.45851, lng: -73.64323, searchText: "jesuit residence jr loyola" },
  { label: "Applied Science Hub (Loyola)", lat: 45.45851, lng: -73.64181, searchText: "applied science hub hu loyola" },
  { label: "Hingston Hall, wing HB (Loyola)", lat: 45.45924, lng: -73.64191, searchText: "hingston hall wing hb loyola" },
  { label: "Hingston Hall, wing HC (Loyola)", lat: 45.45972, lng: -73.64203, searchText: "hingston hall wing hc loyola" },
  { label: "Future Buildings Laboratory (Loyola)", lat: 45.45927, lng: -73.64253, searchText: "future buildings laboratory sh loyola" },
  { label: "Terrebone Building (Loyola)", lat: 45.45999, lng: -73.64084, searchText: "terrebone building ta loyola" },
];
