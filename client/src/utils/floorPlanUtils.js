// unwrap the nested JSON structure
//   1. Exact match on floorKey
//   2. Ends-with match
//   3. First key fallback
export function extractFloorPlan(dataField, floorKey) {
    if (!dataField || typeof dataField !== 'object') return null;
    const key = String(floorKey);
    if (dataField[key] !== undefined) return dataField[key];
    const suffixMatch = Object.keys(dataField).find(k => k.endsWith(key));
    if (suffixMatch) return dataField[suffixMatch];
    return dataField[Object.keys(dataField)[0]] ?? null;
}