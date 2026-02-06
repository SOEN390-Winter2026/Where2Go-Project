function getCampusCoordinates(campusName) {
  const campuses = {
    SGW: { lat: 45.4974, lng: -73.5771 },
    Loyola: { lat: 45.4587, lng: -73.6409 },
  };

  return campuses[campusName] || null;
}

function getCampusBuildings(campusName) {
  const buildings = {
    SGW: [
      {
        id: 'H',
        name: 'Henry F. Hall Building',
        coordinates: [
          { lat: 45.49725, lng: -73.57923 },
          { lat: 45.49725, lng: -73.57854 },
          { lat: 45.49690, lng: -73.57854 },
          { lat: 45.49690, lng: -73.57923 },
        ],
      },
      {
        id: 'GM',
        name: 'Guy-De Maisonneuve Building',
        coordinates: [
          { lat: 45.49658, lng: -73.57808 },
          { lat: 45.49658, lng: -73.57740 },
          { lat: 45.49620, lng: -73.57740 },
          { lat: 45.49620, lng: -73.57808 },
        ],
      },
      {
        id: 'MB',
        name: 'John Molson Building',
        coordinates: [
          { lat: 45.49530, lng: -73.57910 },
          { lat: 45.49530, lng: -73.57850 },
          { lat: 45.49500, lng: -73.57850 },
          { lat: 45.49500, lng: -73.57910 },
        ],
      },
      {
        id: 'LB',
        name: 'J.W. McConnell Building (Library)',
        coordinates: [
          { lat: 45.49710, lng: -73.57825 },
          { lat: 45.49710, lng: -73.57770 },
          { lat: 45.49685, lng: -73.57770 },
          { lat: 45.49685, lng: -73.57825 },
        ],
      },
    ],
    Loyola: [
      {
        id: 'CC',
        name: 'Central Building',
        coordinates: [
          { lat: 45.45890, lng: -73.64070 },
          { lat: 45.45890, lng: -73.64010 },
          { lat: 45.45860, lng: -73.64010 },
          { lat: 45.45860, lng: -73.64070 },
        ],
      },
      {
        id: 'AD',
        name: 'Administration Building',
        coordinates: [
          { lat: 45.45830, lng: -73.64150 },
          { lat: 45.45830, lng: -73.64090 },
          { lat: 45.45800, lng: -73.64090 },
          { lat: 45.45800, lng: -73.64150 },
        ],
      },
      {
        id: 'SP',
        name: 'Student Centre',
        coordinates: [
          { lat: 45.45920, lng: -73.64120 },
          { lat: 45.45920, lng: -73.64060 },
          { lat: 45.45890, lng: -73.64060 },
          { lat: 45.45890, lng: -73.64120 },
        ],
      },
    ],
  };

  return buildings[campusName] || [];
}

module.exports = { getCampusCoordinates, getCampusBuildings };