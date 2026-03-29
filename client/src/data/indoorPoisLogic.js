/**
 * Maps campus/building/floor to their POI overlay PNG.
 */

const VE_VL_POI = {
    1: require('../../assets/indoor-poi-icons/Loyola/VE-VL-1.png'),
    2: require('../../assets/indoor-poi-icons/Loyola/VE-VL-2.png'),
    3: require('../../assets/indoor-poi-icons/Loyola/VE-VL-3.png'),
};

const POI_OVERLAYS = {
    SGW: {
        H: {
            2:  require('../../assets/indoor-poi-icons/SGW/H-2.png'),
            4:  require('../../assets/indoor-poi-icons/SGW/H-4.png'),
            5:  require('../../assets/indoor-poi-icons/SGW/H-5.png'),
            6:  require('../../assets/indoor-poi-icons/SGW/H-6.png'),
            7:  require('../../assets/indoor-poi-icons/SGW/H-7.png'),
            8:  require('../../assets/indoor-poi-icons/SGW/H-8.png'),
            9:  require('../../assets/indoor-poi-icons/SGW/H-9.png'),
            10: require('../../assets/indoor-poi-icons/SGW/H-10.png'),
            11: require('../../assets/indoor-poi-icons/SGW/H-11.png'),
            12: require('../../assets/indoor-poi-icons/SGW/H-12.png'),
        },
        JW: {
            2: require('../../assets/indoor-poi-icons/SGW/LB-2.png'),
            3: require('../../assets/indoor-poi-icons/SGW/LB-3.png'),
            4: require('../../assets/indoor-poi-icons/SGW/LB-4.png'),
            5: require('../../assets/indoor-poi-icons/SGW/LB-5.png'),
        },
        MB: {
            3:  require('../../assets/indoor-poi-icons/SGW/MB-3.png'),
            4:  require('../../assets/indoor-poi-icons/SGW/MB-4.png'),
            6:  require('../../assets/indoor-poi-icons/SGW/MB-6.png'),
            7:  require('../../assets/indoor-poi-icons/SGW/MB-7.png'),
            8:  require('../../assets/indoor-poi-icons/SGW/MB-8.png'),
            9:  require('../../assets/indoor-poi-icons/SGW/MB-9.png'),
            S1: require('../../assets/indoor-poi-icons/SGW/MB-S1.png'),
            S2: require('../../assets/indoor-poi-icons/SGW/MB-S2.png'),
        },
    },
    Loyola: {
        CC: {
            1: require('../../assets/indoor-poi-icons/Loyola/CC-1.png'),
            2: require('../../assets/indoor-poi-icons/Loyola/CC-2.png'),
            3: require('../../assets/indoor-poi-icons/Loyola/CC-3.png'),
            4: require('../../assets/indoor-poi-icons/Loyola/CC-4.png'),
        },
        VE: VE_VL_POI,
        VL: VE_VL_POI,
    },
};

export function getPOIOverlay(campus, buildingCode, floor) {
    if (!campus || !buildingCode || !floor) return null;
    return POI_OVERLAYS?.[campus]?.[buildingCode]?.[floor]
        ?? POI_OVERLAYS?.[campus]?.[buildingCode]?.[Number(floor)]
        ?? null;
}