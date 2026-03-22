// indoorData.js
export const indoorMaps = {
  SGW: {
    Hall: {
      2: {
        image: require('./assets/indoor/SGW/H-2.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H2.json'),
      },
      4: {
        image: require('./assets/indoor/SGW/H-4.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-4.json'),
      },
      5: {
        image: require('./assets/indoor/SGW/H-5.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-5.json'),
      },
      6: {
        image: require('./assets/indoor/SGW/H-6.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-6.json'),
      },
      7: {
        image: require('./assets/indoor/SGW/H-7.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-7.json'),
      },
      8: {
        image: require('./assets/indoor/SGW/H-8.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-8.json'),
      },
      9: {
        image: require('./assets/indoor/SGW/H-9.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-9.json'),
      },
      10: {
        image: require('./assets/indoor/SGW/H-10.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-10.json'),
      },
      11: {
        image: require('./assets/indoor/SGW/H-11.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-11.json'),
      },
      12: {
        image: require('./assets/indoor/SGW/H-12.PNG'),
        data: require('./assets/indoor/SGW/floorplan_H-12.json'),
      },
    },

    MB: {
      6: {
        image: require('./assets/indoor/SGW/MB-6.PNG'),
        data: require('./assets/indoor/SGW/floorplan_MB-6.json'), // you'll add later
      },
      7: {
        image: require('./assets/indoor/SGW/MB-7.PNG'),
        data: require('./assets/indoor/SGW/floorplan_MB-7.json'),
      },
      8: {
        image: require('./assets/indoor/SGW/MB-8.PNG'),
        data: require('./assets/indoor/SGW/floorplan_MB-8.json'),
      },
      9: {
        image: require('./assets/indoor/SGW/MB-9.PNG'),
        data: require('./assets/indoor/SGW/floorplan_MB-9.json'),
      },
      S1: {
        image: require('./assets/indoor/SGW/MB-S1.PNG'),
        data: require('./assets/indoor/SGW/floorplan_MB-S1.json'),
      },
      S2: {
        image: require('./assets/indoor/SGW/MB-S2.PNG'),
        data: require('./assets/indoor/SGW/floorplan_MB-S2.json'),
      },
    },
  },

  Loyola: {
    CC: {
      1: {
        image: require('./assets/indoor/Loyola/CC-1.PNG'),
        data: require('./assets/indoor/Loyola/floorplan_CC1.json'),
      },
      2: {
        image: require('./assets/indoor/Loyola/CC-2.PNG'),
        data: require('./assets/indoor/Loyola/floorplan_CC2.json'),
      },
      3: {
        image: require('./assets/indoor/Loyola/CC-3.PNG'),
        data: require('./assets/indoor/Loyola/floorplan_CC3.json'),
      },
      4: {
        image: require('./assets/indoor/Loyola/CC-4.PNG'),
        data: require('./assets/indoor/Loyola/floorplan_CC4.json'),
      },
    },

    VE: {
      1: {
        image: require('./assets/indoor/Loyola/VEVL-1.PNG'),
        data: require('./assets/indoor/Loyola/floorplan_VEVL1.json'),
      },
      2: {
        image: require('./assets/indoor/Loyola/VEVL-2.PNG'),
        data: require('./assets/indoor/Loyola/floorplan_VEVL2.json'),
      },
      3: {
        image: require('./assets/indoor/Loyola/VEVL-3.PNG'),
        // no JSON yet → safe placeholder
        data: null,
      },
    },
  },
};