//Resolves a building code to a destination { label, lat, lng }. Used in the flow (calendar → directions).

function resolveBuildingCoords(building) {
  if (!building) return null;
  const firstCoord = building.coordinates?.[0];
  if (firstCoord?.latitude != null && firstCoord?.longitude != null) {
    return { lat: firstCoord.latitude, lng: firstCoord.longitude };
  }
  if (building.latitude != null && building.longitude != null) {
    return { lat: building.latitude, lng: building.longitude };
  }
  return null;
}

export function getDestinationFromBuildingCode(buildingCode, buildings) {
  if (!buildingCode || !Array.isArray(buildings)) return null;

  const targetBuilding = buildings.find((b) => b.code === buildingCode);
  if (!targetBuilding) return null;

  const coords = resolveBuildingCoords(targetBuilding);
  if (!coords) return null;

  return {
    label: targetBuilding.name,
    lat: coords.lat,
    lng: coords.lng,
  };
}
