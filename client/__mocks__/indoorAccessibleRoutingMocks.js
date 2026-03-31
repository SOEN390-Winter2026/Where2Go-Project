const makeFloor = (floorKey, { waypoints, rooms }) => ({
  image: null,
  data: {
    [floorKey]: {
      building: "Hall",
      floor: floorKey,
      waypoints,
      rooms,
    },
  },
});

function defaultIndoorMaps() {
  return {
    SGW: {
      H: {
        // Floor ids here match how IndoorMaps stores them ("7", "8", ...)
        7: makeFloor("H-7", {
          rooms: [
            { id: "H-701", bounds: { x: 0.0, y: 0.0, w: 0.1, h: 0.1 }, nearestWaypoint: "wpStart" },
          ],
          waypoints: [
            { id: "wpStart", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["wpE7"] },
            // Elevator on floor 7
            {
              id: "wpE7",
              type: "elevator",
              position: { x: 0.2, y: 0.1 },
              connections: [],
              floorsReachable: ["8"],
            },
            // Staircase exists but should be avoided by default
            {
              id: "wpS7",
              type: "staircase",
              position: { x: 0.2, y: 0.2 },
              connections: [],
              floorsReachable: ["8"],
            },
          ],
        }),

        8: makeFloor("H-8", {
          rooms: [
            { id: "H-801", bounds: { x: 0.9, y: 0.0, w: 0.1, h: 0.1 }, nearestWaypoint: "wpGoal" },
          ],
          waypoints: [
            // Elevator on floor 8 (no explicit cross-floor id in data; algorithm matches by closest position)
            {
              id: "wpE8",
              type: "elevator",
              position: { x: 0.21, y: 0.1 },
              connections: ["wpGoal"],
              floorsReachable: ["7"],
            },
            { id: "wpGoal", type: "door", position: { x: 0.9, y: 0.1 }, connections: [] },
            {
              id: "wpS8",
              type: "staircase",
              position: { x: 0.21, y: 0.21 },
              connections: [],
              floorsReachable: ["7"],
            },
          ],
        }),
      },
    },
  };
}

function loadGenerateAccessibleIndoorPath(indoorMaps) {
  jest.resetModules();
  jest.doMock("../src/data/indoorData", () => ({ indoorMaps }));
  return require("../src/services/indoorAccessibleRouting").generateAccessibleIndoorPath;
}

module.exports = {
  makeFloor,
  defaultIndoorMaps,
  loadGenerateAccessibleIndoorPath,
};

