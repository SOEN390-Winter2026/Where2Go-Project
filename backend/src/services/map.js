function getCampusCoordinates(campusName) {
  const campuses = {
    SGW: { lat: 45.4974, lng: -73.5771 },
    Loyola: { lat: 45.4587, lng: -73.6409 },
  };

  return campuses[campusName] || null;
}

module.exports = { getCampusCoordinates };