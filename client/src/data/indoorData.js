const VEVL = {
  1: {
    image: require('../../assets/indoor/Loyola/VEVL-1.png'),
    data: require('../../assets/indoor/Loyola/floorplan_VEVL1.json'),
  },
  2: {
    image: require('../../assets/indoor/Loyola/VEVL-2.png'),
    data: require('../../assets/indoor/Loyola/floorplan_VEVL2.json'),
  },
  3: {
    image: require('../../assets/indoor/Loyola/VEVL-3.png'),
    data: require('../../assets/indoor/Loyola/floorplan_VEVL3.json'),
  },
};

export const indoorMaps = {
  SGW: {
    H: {
      2: {
        image: require('../../assets/indoor/SGW/H-2.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-2.json'),
      },
      4: {
        image: require('../../assets/indoor/SGW/H-4.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-4.json'),
      },
      5: {
        image: require('../../assets/indoor/SGW/H-5.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-5.json'),
      },
      6: {
        image: require('../../assets/indoor/SGW/H-6.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-6.json'),
      },
      7: {
        image: require('../../assets/indoor/SGW/H-7.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-7.json'),
      },
      8: {
        image: require('../../assets/indoor/SGW/H-8.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-8.json'),
      },
      9: {
        image: require('../../assets/indoor/SGW/H-9.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-9.json'),
      },
      10: {
        image: require('../../assets/indoor/SGW/H-10.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-10.json'),
      },
      11: {
        image: require('../../assets/indoor/SGW/H-11.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-11.json'),
      },
      12: {
        image: require('../../assets/indoor/SGW/H-12.png'),
        data: require('../../assets/indoor/SGW/floorplan_H-12.json'),
      },
    },

    MB: {
      3: {
        image: require('../../assets/indoor/SGW/MB-3.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-6.json'), // you'll add later
      },
      4: {
        image: require('../../assets/indoor/SGW/MB-4.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-7.json'),
      },
      5: {
        image: require('../../assets/indoor/SGW/MB-5.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-8.json'),
      },
      6: {
        image: require('../../assets/indoor/SGW/MB-6.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-6.json'), // you'll add later
      },
      7: {
        image: require('../../assets/indoor/SGW/MB-7.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-7.json'),
      },
      8: {
        image: require('../../assets/indoor/SGW/MB-8.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-8.json'),
      },
      9: {
        image: require('../../assets/indoor/SGW/MB-9.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-9.json'),
      },
      S1: {
        image: require('../../assets/indoor/SGW/MB-S1.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-S1.json'),
      },
      S2: {
        image: require('../../assets/indoor/SGW/MB-S2.png'),
        data: require('../../assets/indoor/SGW/floorplan_MB-S2.json'),
      },
    },

      JW: {
        2: {
          image: require('../../assets/indoor/SGW/LB-2.png'),
          data: require('../../assets/indoor/SGW/floorplan_LB-2.json'),
        },
        3: {
          image: require('../../assets/indoor/SGW/LB-3.png'),
          data: require('../../assets/indoor/SGW/floorplan_LB-3.json'), 
        },
        4: {
          image: require('../../assets/indoor/SGW/LB-4.png'),
          data: require('../../assets/indoor/SGW/floorplan_LB-4.json'),
        },
        5: {
          image: require('../../assets/indoor/SGW/LB-5.png'),
          data: require('../../assets/indoor/SGW/floorplan_LB-5.json'),
        }
      }
  },

  Loyola: {
    CC: {
      1: {
        image: require('../../assets/indoor/Loyola/CC-1.png'),
        data: require('../../assets/indoor/Loyola/floorplan_CC1.json'),
      },
      2: {
        image: require('../../assets/indoor/Loyola/CC-2.png'),
        data: require('../../assets/indoor/Loyola/floorplan_CC2.json'),
      },
      3: {
        image: require('../../assets/indoor/Loyola/CC-3.png'),
        data: require('../../assets/indoor/Loyola/floorplan_CC3.json'),
      },
      4: {
        image: require('../../assets/indoor/Loyola/CC-4.png'),
        data: require('../../assets/indoor/Loyola/floorplan_CC4.json'),
      },
    },
    //pointing to same floor plans
    VE: VEVL,
    VL: VEVL,
  },
};