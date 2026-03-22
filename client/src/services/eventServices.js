import { getDestinationFromBuildingCode } from '../utils/eventDestinationResolver';

export function resolveEventDestination({ buildingCode, buildings, userLocation }) {
  if (!buildingCode) return null;

  const dest = getDestinationFromBuildingCode(buildingCode, buildings);
  if (!dest) return null;

  const targetBuilding = buildings.find((b) => b.code === buildingCode);

  let origin = null;
  if (userLocation?.latitude != null && userLocation?.longitude != null) {
    origin = {
      label: "Your location",
      lat: userLocation.latitude,
      lng: userLocation.longitude,
    };
  }

  return { dest, targetBuilding, origin };
}