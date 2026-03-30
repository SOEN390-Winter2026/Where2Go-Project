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

/**
 * Building H on SGW, floors 7 and 8 linked only by staircases (no elevators).
 * Used for NO_PATH with default avoidStairs, and for success when avoidStairs is false.
 */
function indoorMapsStaircaseOnlyH7H8() {
  return {
    SGW: {
      H: {
        7: {
          image: null,
          data: {
            "H-7": {
              waypoints: [
                { id: "wpStart", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["wpS7"] },
                {
                  id: "wpS7",
                  type: "staircase",
                  position: { x: 0.2, y: 0.2 },
                  connections: [],
                  floorsReachable: ["8"],
                },
              ],
              rooms: [{ id: "H-701", bounds: { x: 0, y: 0, w: 0.1, h: 0.1 }, nearestWaypoint: "wpStart" }],
            },
          },
        },
        8: {
          image: null,
          data: {
            "H-8": {
              waypoints: [
                {
                  id: "wpS8",
                  type: "staircase",
                  position: { x: 0.21, y: 0.21 },
                  connections: ["wpGoal"],
                  floorsReachable: ["7"],
                },
                { id: "wpGoal", type: "door", position: { x: 0.9, y: 0.1 }, connections: [] },
              ],
              rooms: [{ id: "H-801", bounds: { x: 0.9, y: 0, w: 0.1, h: 0.1 }, nearestWaypoint: "wpGoal" }],
            },
          },
        },
      },
    },
  };
}

module.exports = {
  makeFloor,
  defaultIndoorMaps,
  indoorMapsStaircaseOnlyH7H8,
  loadGenerateAccessibleIndoorPath,
};

