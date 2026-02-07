function getCampusCoordinates(campusName) {
  const campuses = {
    SGW: { lat: 45.4974, lng: -73.5771 },
    Loyola: { lat: 45.4587, lng: -73.6409 },
  };

  return campuses[campusName] || null;
}

/**
 * Building footprints as polygon coordinates [lat, lng] for map highlighting.
 * Approximate outlines for key Concordia buildings.
 */
const CAMPUS_BUILDINGS = {
  SGW: [
    {
      id: 'hall',
      name: 'Hall Building',
      coordinates: [
        { latitude: 45.4977303, longitude: -73.5790279 },
        { latitude: 45.4973808, longitude: -73.5783087 },
        { latitude: 45.4968633, longitude: -73.57891 },
        { latitude: 45.4971630, longitude: -73.5795962 },
      ],
    },
    {
      id: 'jw',
      name: 'McConnell Building',
      coordinates: [
        { latitude: 45.4973400, longitude: -73.5780630 },
        { latitude: 45.4968756, longitude: -73.5770947 },
        { latitude: 45.4962439, longitude: -73.5777203 },
        { latitude: 45.4966840, longitude: -73.5786444 },
      ],
    },
    {
      id: 'va',
      name: 'Visual Arts Building',
      coordinates: [
        { latitude: 45.49618, longitude: -73.57377 },
        { latitude: 45.49593, longitude: -73.57324 },
        { latitude: 45.49538, longitude: -73.57376 },
        { latitude: 45.49564, longitude: -73.57432 },
      ],
    },
    {
      id: 'ev',
      name: 'Engineering & Visual Arts',
      coordinates: [
        { latitude: 45.4958829, longitude: -73.5784841 },
        { latitude: 45.4954551, longitude: -73.5775882 },
        { latitude: 45.49522074, longitude: -73.5778903 },
        { latitude: 45.4956030, longitude: -73.5787664},
      ],
    },
    {
      id: 'gn',
      name: 'Grey Nuns Building',
      coordinates: [
        { latitude: 45.49457, longitude: -73.57699 },
        { latitude: 45.49383, longitude: -73.57528 },
        { latitude: 45.49240, longitude: -73.57666 },
        { latitude: 45.49335, longitude: -73.57842 },
      ],
    },
    {
      id: 'fg',
      name: 'Faubourg Building',
      coordinates: [
        { latitude: 45.49494, longitude: -73.57784 },
        { latitude: 45.49467, longitude: -73.57722 },
        { latitude: 45.49355, longitude: -73.57875 },
        { latitude: 45.49382, longitude: -73.57917 },
      ],
    },
    {
      id: 'cl',
      name: 'CL Annex Building',
      coordinates: [
        { latitude: 45.49448, longitude: -73.57933 },
        { latitude: 45.49423, longitude: -73.57889 },
        { latitude: 45.49391, longitude: -73.57931 },
        { latitude: 45.49414, longitude: -73.57970 },
      ],
    },
    {
      id: 'td',
      name: 'Toronto-Dominion Building',
      coordinates: [
        { latitude: 45.49521, longitude: -73.57841 },
        { latitude: 45.49503, longitude: -73.57800 },
        { latitude: 45.49451, longitude: -73.57858 },
        { latitude: 45.49472, longitude: -73.57895 },
      ],
    },
    {
      id: 'mb',
      name: 'John Molson Building',
      coordinates: [
        { latitude: 45.49560, longitude: -73.57926},
        { latitude: 45.49525, longitude: -73.57850 },
        { latitude: 45.49499, longitude: -73.57878 },
        { latitude: 45.49538, longitude: -73.57954 },
      ],
    },
    {
      id: 'gm',
      name: 'Guy-De Maisonneuve Building',
      coordinates: [
        { latitude: 45.49614, longitude: -73.57882 },
        { latitude: 45.49594, longitude: -73.57843 },
        { latitude: 45.49560, longitude: -73.57878 },
        { latitude: 45.49578, longitude: -73.57918 },
      ],
    },
    {
      id: 'ls',
      name: 'Learning Square Building',
      coordinates: [
        { latitude: 45.49654, longitude: -73.57958 },
        { latitude: 45.49638, longitude: -73.57923 },
        { latitude: 45.49616, longitude: -73.57944 },
        { latitude: 45.49630, longitude: -73.57978 },
      ],
    },
    {
      id: 'er',
      name: 'ER Building',
      coordinates: [
        { latitude: 45.49669, longitude: -73.58014 },
        { latitude: 45.49653, longitude: -73.57966 },
        { latitude: 45.49612, longitude: -73.58000 },
        { latitude: 45.49627, longitude: -73.58040 },
      ],
    },
    {
      id: 'gs',
      name: 'GS Building',
      coordinates: [
        { latitude: 45.49675, longitude: -73.58137 },
        { latitude: 45.49655, longitude: -73.58078 },
        { latitude: 45.49641, longitude: -73.58087 },
        { latitude: 45.49660, longitude: -73.58147 },
      ],
    },
    {
      id: 'sb',
      name: 'Samuel Bronfman Building',
      coordinates: [
        { latitude: 45.49666, longitude: -73.58621 },
        { latitude: 45.49666, longitude: -73.58586 },
        { latitude: 45.49643, longitude: -73.58587 },
        { latitude: 45.49643, longitude: -73.58621 },
      ],
    },
    {
      id: 'q',
      name: 'Q Annex',
      coordinates: [
        { latitude: 45.49668, longitude: -73.57908 },
        { latitude: 45.49664, longitude: -73.57902 },
        { latitude: 45.49655, longitude: -73.57912 },
        { latitude: 45.49658, longitude: -73.57918 },
      ],
    },
    {
      id: 'p',
      name: 'P Annex',
      coordinates: [
        { latitude: 45.49670, longitude: -73.57913 },
        { latitude: 45.49668, longitude: -73.57909 },
        { latitude: 45.49659, longitude: -73.57920 },
        { latitude: 45.49661, longitude: -73.57924 },
      ],
    },
    {
      id: 't',
      name: 'T Annex',
      coordinates: [
        { latitude: 45.49674, longitude: -73.57925 },
        { latitude: 45.49673, longitude: -73.57922 },
        { latitude: 45.49664, longitude: -73.57930 },
        { latitude: 45.49666, longitude: -73.57934 },
      ],
    },
    {
      id: 'rr',
      name: 'RR Annex',
      coordinates: [
        { latitude: 45.49680, longitude: -73.57933 },
        { latitude: 45.49676, longitude: -73.57925 },
        { latitude: 45.49661, longitude: -73.57940 },
        { latitude: 45.49665, longitude: -73.57948 },
      ],
    },
    {
      id: 'r',
      name: 'R Annex',
      coordinates: [
        { latitude: 45.49683, longitude: -73.57940 },
        { latitude: 45.49680, longitude: -73.57934 },
        { latitude: 45.49667, longitude: -73.57947 },
        { latitude: 45.49670, longitude: -73.57952 },
      ],
    },
    {
      id: 'fa',
      name: 'FA Annex',
      coordinates: [
        { latitude: 45.49684, longitude: -73.57944 },
        { latitude: 45.49683, longitude: -73.57940 },
        { latitude: 45.49670, longitude: -73.57952 },
        { latitude: 45.49672, longitude: -73.57956 },
      ],
    },
    {
      id: 'en',
      name: 'EN Annex',
      coordinates: [
        { latitude: 45.49693, longitude: -73.57955 },
        { latitude: 45.49689, longitude: -73.57947 },
        { latitude: 45.49667, longitude: -73.57971 },
        { latitude: 45.49670, longitude: -73.57978 },
      ],
    },
    {
      id: 'x',
      name: 'X Annex',
      coordinates: [
        { latitude: 45.49695, longitude: -73.57966 },
        { latitude: 45.49691, longitude: -73.57958 },
        { latitude: 45.49681, longitude: -73.57967 },
        { latitude: 45.49686, longitude: -73.57976 },
      ],
    },
    {
      id: 'z',
      name: 'Z Annex',
      coordinates: [
        { latitude: 45.49699, longitude: -73.57974 },
        { latitude: 45.49695, longitude: -73.57966 },
        { latitude: 45.49685, longitude: -73.57976 },
        { latitude: 45.49689, longitude: -73.57984 },
      ],
    },
    {
      id: 'pr',
      name: 'PR Annex',
      coordinates: [
        { latitude: 45.49707, longitude: -73.57988 },
        { latitude: 45.49705, longitude: -73.57983 },
        { latitude: 45.49694, longitude: -73.57994 },
        { latitude: 45.49696, longitude: -73.57998 },
      ],
    },
    {
      id: 'v',
      name: 'V Annex',
      coordinates: [
        { latitude: 45.49709, longitude: -73.57992 },
        { latitude: 45.49707, longitude: -73.57988 },
        { latitude: 45.49696, longitude: -73.57998 },
        { latitude: 45.49698, longitude: -73.58002 },
      ],
    },
    {
      id: 'm',
      name: 'M Annex',
      coordinates: [
        { latitude: 45.49777, longitude: -73.57998 },
        { latitude: 45.49770, longitude: -73.57982 },
        { latitude: 45.49744, longitude: -73.58006 },
        { latitude: 45.49752, longitude: -73.58023 },
      ],
    },
    {
      id: 's',
      name: 'S Annex',
      coordinates: [
        { latitude: 45.49782, longitude: -73.58009 },
        { latitude: 45.49777, longitude: -73.57998 },
        { latitude: 45.49752, longitude: -73.58023 },
        { latitude: 45.49755, longitude: -73.58037 },
      ],
    },
    {
      id: 'ci',
      name: 'CI Annex',
      coordinates: [
        { latitude: 45.49788, longitude: -73.58021 },
        { latitude: 45.49782, longitude: -73.58009 },
        { latitude: 45.49755, longitude: -73.58037 },
        { latitude: 45.49760, longitude: -73.58048 },
      ],
    },
    {
      id: 'mi',
      name: 'MI Annex',
      coordinates: [
        { latitude: 45.49781, longitude: -73.57923 },
        { latitude: 45.49778, longitude: -73.57917 },
        { latitude: 45.49762, longitude: -73.57934 },
        { latitude: 45.49765, longitude: -73.57940 },
      ],
    },
    {
      id: 'd',
      name: 'D Annex',
      coordinates: [
        { latitude: 45.49785, longitude: -73.57931 },
        { latitude: 45.49781, longitude: -73.57923 },
        { latitude: 45.49771, longitude: -73.57934 },
        { latitude: 45.49774, longitude: -73.57941 },
      ],
    },
    {
      id: 'b',
      name: 'B Annex',
      coordinates: [
        { latitude: 45.49790, longitude: -73.57943 },
        { latitude: 45.49788, longitude: -73.57939 },
        { latitude: 45.49771, longitude: -73.57956 },
        { latitude: 45.49773, longitude: -73.57960 },
      ],
    },
    {
      id: 'k',
      name: 'K Annex',
      coordinates: [
        { latitude: 45.49792, longitude: -73.57946 },
        { latitude: 45.49790, longitude: -73.57943 },
        { latitude: 45.49773, longitude: -73.57960 },
        { latitude: 45.49774, longitude: -73.57963 },
      ],
    },
    {
      id: 'mu',
      name: 'MU Annex',
      coordinates: [
        { latitude: 45.49796, longitude: -73.57954 },
        { latitude: 45.49794, longitude: -73.57950 },
        { latitude: 45.49777, longitude: -73.57966 },
        { latitude: 45.49778, longitude: -73.57970 },
      ],
    },
  ],
  Loyola: [
    {
      id: 'do',
      name: 'Stinger Dome Building',
      coordinates: [
        { latitude: 45.45834, longitude: -73.63596 },
        { latitude: 45.45793, longitude: -73.63524 },
        { latitude: 45.45697, longitude: -73.63636 },
        { latitude: 45.45738, longitude: -73.63708 },
      ],
    },
    {
      id: 'pc',
      name: 'PERFORM Center',
      coordinates: [
        { latitude: 45.45728, longitude: -73.63763 },
        { latitude: 45.45695, longitude: -73.63677 },
        { latitude: 45.45668, longitude: -73.63699 },
        { latitude: 45.45702, longitude: -73.63784 },
      ],
    },
    {
      id: 'ra',
      name: 'Recreation and Athletics Complex',
      coordinates: [
        { latitude: 45.45701, longitude: -73.63806 },
        { latitude: 45.45667, longitude: -73.63715 },
        { latitude: 45.45639, longitude: -73.63737 },
        { latitude: 45.45669, longitude: -73.63814 },
      ],
    },
    {
      id: 'ge',
      name: 'Centre for Structural and Functional Genomics',
      coordinates: [
        { latitude: 45.45717, longitude: -73.64057 },
        { latitude: 45.45704, longitude: -73.64016 },
        { latitude: 45.45680, longitude: -73.64034 },
        { latitude: 45.45695, longitude: -73.64074 },
      ],
    },
    {
      id: 'cj',
      name: 'Comunications Studies and Journalism Building',
      coordinates: [
        { latitude: 45.45783, longitude: -73.64048 },
        { latitude: 45.45747, longitude: -73.63951 },
        { latitude: 45.45702, longitude: -73.63998 },
        { latitude: 45.45736, longitude: -73.64085 },
      ],
    },
    {
      id: 'sp',
      name: 'Richard J. Renaud Science Complex',
      coordinates: [
        { latitude: 45.45833, longitude: -73.64141 },
        { latitude: 45.45816, longitude: -73.64098 },
        { latitude: 45.45731, longitude: -73.64167 },
        { latitude: 45.45747, longitude: -73.64209 },
      ],
    },
    {
      id: 'ad',
      name: 'Administration Building',
      coordinates: [
        { latitude: 45.45838, longitude: -73.63976 },
        { latitude: 45.45826, longitude: -73.63944 },
        { latitude: 45.45780, longitude: -73.63983 },
        { latitude: 45.45791, longitude: -73.64013 },
      ],
    },
    {
      id: 'cc',
      name: 'Central Building',
      coordinates: [
        { latitude: 45.45852, longitude: -73.64068 },
        { latitude: 45.45822, longitude: -73.63990 },
        { latitude: 45.45808, longitude: -73.64001 },
        { latitude: 45.45838, longitude: -73.64079 },
      ],
    },
    {
      id: 'rf',
      name: 'Loyola Jesuit Hall and Conference Centre',
      coordinates: [
        { latitude: 45.45882, longitude: -73.64113 },
        { latitude: 45.45864, longitude: -73.64067 },
        { latitude: 45.45834, longitude: -73.64094 },
        { latitude: 45.45850, longitude: -73.64137 },
      ],
    },
    {
      id: 'fc',
      name: 'F.C Smith Building',
      coordinates: [
        { latitude: 45.45881, longitude: -73.63960 },
        { latitude: 45.45857, longitude: -73.63889 },
        { latitude: 45.45835, longitude: -73.63906 },
        { latitude: 45.45860, longitude: -73.63976 },
      ],
    },
    {
      id: 'qa',
      name: 'Quadrangle',
      coordinates: [
        { latitude: 45.45903, longitude: -73.64008 },
        { latitude: 45.45886, longitude: -73.63967 },
        { latitude: 45.45848, longitude: -73.63995 },
        { latitude: 45.45861, longitude: -73.64036 },
      ],
    },
    {
      id: 'py',
      name: 'Psychology Building',
      coordinates: [
        { latitude: 45.45920, longitude: -73.64052 },
        { latitude: 45.45905, longitude: -73.64014 },
        { latitude: 45.45867, longitude: -73.64046 },
        { latitude: 45.45881, longitude: -73.64084 },
      ],
    },
    {
      id: 've',
      name: 'Vanier Extension',
      coordinates: [
        { latitude: 45.45905, longitude: -73.63886 },
        { latitude: 45.45883, longitude: -73.63827 },
        { latitude: 45.45862, longitude: -73.63843 },
        { latitude: 45.45884, longitude: -73.63903 },
      ],
    },
    {
      id: 'vl',
      name: 'Vanier Library Building',
      coordinates: [
        { latitude: 45.45931, longitude: -73.63866 },
        { latitude: 45.45902, longitude: -73.63791 },
        { latitude: 45.45883, longitude: -73.63827 },
        { latitude: 45.45905, longitude: -73.63886 },
      ],
    },
    {
      id: 'pt',
      name: 'Oscar Peterson Concert Hall',
      coordinates: [
        { latitude: 45.45948, longitude: -73.63913 },
        { latitude: 45.45930, longitude: -73.63867 },
        { latitude: 45.45916, longitude: -73.63878 },
        { latitude: 45.45934, longitude: -73.63924 },
      ],
    },
    {
      id: 'sc',
      name: 'Student Centre',
      coordinates: [
        { latitude: 45.45930, longitude: -73.63932 },
        { latitude: 45.45917, longitude: -73.63897 },
        { latitude: 45.45899, longitude: -73.63912 },
        { latitude: 45.45913, longitude: -73.63946 },
      ],
    },
    {
      id: 'bh',
      name: 'BH Annex',
      coordinates: [
        { latitude: 45.45979, longitude: -73.63909 },
        { latitude: 45.45975, longitude: -73.63902 },
        { latitude: 45.45966, longitude: -73.63909 },
        { latitude: 45.45969, longitude: -73.63917 },
      ],
    },
    {
      id: 'bb',
      name: 'BB Annex',
      coordinates: [
        { latitude: 45.45982, longitude: -73.63917 },
        { latitude: 45.45979, longitude: -73.63909 },
        { latitude: 45.45969, longitude: -73.63917 },
        { latitude: 45.45972, longitude: -73.63924 },
      ],
    },
    {
      id: 'ps',
      name: 'Physical Services Building',
      coordinates: [
        { latitude: 45.45996, longitude: -73.64007 },
        { latitude: 45.45968, longitude: -73.63933 },
        { latitude: 45.45941, longitude: -73.63955 },
        { latitude: 45.45969, longitude: -73.64029 },
      ],
    },
    {
      id: 'si',
      name: 'St. Ignatius of Loyola Church',
      coordinates: [
        { latitude: 45.45817, longitude: -73.64252 },
        { latitude: 45.45794, longitude: -73.64193 },
        { latitude: 45.45752, longitude: -73.64227 },
        { latitude: 45.45774, longitude: -73.64285 },
      ],
    },
    {
      id: 'jr',
      name: 'Jesuit Residence',
      coordinates: [
        { latitude: 45.45863, longitude: -73.64331 },
        { latitude: 45.45854, longitude: -73.64305 },
        { latitude: 45.45840, longitude: -73.64316 },
        { latitude: 45.45849, longitude: -73.64340 },
      ],
    },
    {
      id: 'hu',
      name: 'Applied Science Hub',
      coordinates: [
        { latitude: 45.45872, longitude: -73.64190 },
        { latitude: 45.45858, longitude: -73.64150 },
        { latitude: 45.45829, longitude: -73.64172 },
        { latitude: 45.45844, longitude: -73.64212 },
      ],
    },
    {
      id: 'hb',
      name: 'Hingston Hall, wing HB',
      coordinates: [
        { latitude: 45.45955, longitude: -73.64198 },
        { latitude: 45.45937, longitude: -73.64149 },
        { latitude: 45.45893, longitude: -73.64183 },
        { latitude: 45.45913, longitude: -73.64232 },
      ],
    },
    {
      id: 'hc',
      name: 'Hingston Hall, wing HC',
      coordinates: [
        { latitude: 45.45991, longitude: -73.64204 },
        { latitude: 45.45981, longitude: -73.64181 },
        { latitude: 45.45954, longitude: -73.64202 },
        { latitude: 45.45963, longitude: -73.64225 },
      ],
    },
    {
      id: 'sh',
      name: 'Future Buildings Laboratory',
      coordinates: [
        { latitude: 45.45932, longitude: -73.64263 },
        { latitude: 45.45932, longitude: -73.64243 },
        { latitude: 45.45923, longitude: -73.64242 },
        { latitude: 45.45923, longitude: -73.64262 },
      ],
    },
    {
      id: 'ta',
      name: 'Terrebone Building',
      coordinates: [
        { latitude: 45.46008, longitude: -73.64090 },
        { latitude: 45.46001, longitude: -73.64072 },
        { latitude: 45.45991, longitude: -73.64078 },
        { latitude: 45.45998, longitude: -73.64098 },
      ],
    },
  ],
};

function getBuildings(campusName) {
  return CAMPUS_BUILDINGS[campusName] || [];
}

module.exports = { getCampusCoordinates, getBuildings };