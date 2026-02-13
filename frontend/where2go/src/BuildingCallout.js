import { StyleSheet, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import PropTypes from 'prop-types';
import { colors } from './theme/colors';

export const buildingImages = {
  // SGW campus
  H: require('../assets/buildings/SGWImages/hBuilding.png'),
  JW: require('../assets/buildings/SGWImages/gnBuilding.png'),
  VA: require('../assets/buildings/SGWImages/vaBuilding.png'),
  EV: require('../assets/buildings/SGWImages/evBuilding.png'),
  GN: require('../assets/buildings/SGWImages/gnBuilding.png'),
  FG: require('../assets/buildings/SGWImages/fgBuilding.png'),
  CL: require('../assets/buildings/SGWImages/clBuilding.png'),
  TD: require('../assets/buildings/SGWImages/tdBuilding.png'),
  MB: require('../assets/buildings/SGWImages/mbBuilding.png'),
  GM: require('../assets/buildings/SGWImages/gmBuilding.png'),
  LS: require('../assets/buildings/SGWImages/lsBuilding.png'),
  ER: require('../assets/buildings/SGWImages/erBuilding.png'),
  GS: require('../assets/buildings/SGWImages/gsBuilding.png'),
  SB: require('../assets/buildings/SGWImages/sbBuilding.png'),
  Q: require('../assets/buildings/SGWImages/qBuilding.png'),
  P: require('../assets/buildings/SGWImages/pBuilding.png'),
  T: require('../assets/buildings/SGWImages/tBuilding.png'),
  RR: require('../assets/buildings/SGWImages/rrBuilding.png'),
  R: require('../assets/buildings/SGWImages/rBuilding.png'),
  FA: require('../assets/buildings/SGWImages/faBuilding.png'),
  EN: require('../assets/buildings/SGWImages/enBuilding.png'),
  X: require('../assets/buildings/SGWImages/xBuilding.png'),
  Z: require('../assets/buildings/SGWImages/zBuilding.png'),
  PR: require('../assets/buildings/SGWImages/prBuilding.png'),
  V: require('../assets/buildings/SGWImages/vBuilding.png'),
  M: require('../assets/buildings/SGWImages/mBuilding.png'),
  S: require('../assets/buildings/SGWImages/sBuilding.png'),
  CI: require('../assets/buildings/SGWImages/ciBuilding.png'),
  MI: require('../assets/buildings/SGWImages/miBuilding.png'),
  D: require('../assets/buildings/SGWImages/dBuilding.png'),
  B: require('../assets/buildings/SGWImages/bBuilding.png'),
  K: require('../assets/buildings/SGWImages/kBuilding.png'),
  MU: require('../assets/buildings/SGWImages/muBuilding.png'),
  // Loyola campus
  AD: require('../assets/buildings/LoyolaImages/adBuilding.png'),
  BB: require('../assets/buildings/LoyolaImages/bbBuilding.png'),
  BH: require('../assets/buildings/LoyolaImages/bhBuilding.png'),
  CC: require('../assets/buildings/LoyolaImages/ccBuilding.png'),
  CJ: require('../assets/buildings/LoyolaImages/cjBuilding.png'),
  DO: require('../assets/buildings/LoyolaImages/doBuilding.png'),
  FC: require('../assets/buildings/LoyolaImages/fcBuilding.png'),
  GE: require('../assets/buildings/LoyolaImages/geBuilding.png'),
  HA: require('../assets/buildings/LoyolaImages/haBuilding.png'),
  HB: require('../assets/buildings/LoyolaImages/hbBuilding.png'),
  HC: require('../assets/buildings/LoyolaImages/hcBuilding.png'),
  HU: require('../assets/buildings/LoyolaImages/huBuilding.png'),
  JR: require('../assets/buildings/LoyolaImages/jrBuilding.png'),
  PC: require('../assets/buildings/LoyolaImages/pcBuilding.png'),
  PS: require('../assets/buildings/LoyolaImages/psBuilding.png'),
  PT: require('../assets/buildings/LoyolaImages/ptBuilding.png'),
  PY: require('../assets/buildings/LoyolaImages/pyBuilding.png'),
  QA: require('../assets/buildings/LoyolaImages/qaBuilding.png'),
  RA: require('../assets/buildings/LoyolaImages/raBuilding.png'),
  RF: require('../assets/buildings/LoyolaImages/rfBuilding.png'),
  SC: require('../assets/buildings/LoyolaImages/scBuilding.png'),
  SH: require('../assets/buildings/LoyolaImages/shBuilding.png'),
  SI: require('../assets/buildings/LoyolaImages/siBuilding.png'),
  SP: require('../assets/buildings/LoyolaImages/spBuilding.png'),
  TA: require('../assets/buildings/LoyolaImages/taBuilding.png'),
  VE: require('../assets/buildings/LoyolaImages/veBuilding.png'),
  VL: require('../assets/buildings/LoyolaImages/vlBuilding.png'),
};

const getCentroid = (coordinates) => {
  const len = coordinates.length;
  const sum = coordinates.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / len,
    longitude: sum.longitude / len,
  };
};

const BuildingCallout = ({ buildings, onBuildingPress }) => {
  if (!buildings || buildings.length === 0) return null;

  return (
    <>
      {buildings.map((building) => {
        const center = getCentroid(building.coordinates);
        return (
          <Marker
            key={building.id}
            coordinate={center}
            tracksViewChanges={false}
            onPress={() => onBuildingPress(building)}
          >
            <View style={styles.markerLabel}>
              <Text style={styles.markerLabelText}>{building.code}</Text>
            </View>
          </Marker>
        );
      })}
    </>
  );
};

BuildingCallout.propTypes = {
  buildings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      code: PropTypes.string,
      address: PropTypes.string,
      link: PropTypes.string,
      coordinates: PropTypes.arrayOf(
        PropTypes.shape({
          latitude: PropTypes.number,
          longitude: PropTypes.number,
        })
      ),
    })
  ).isRequired,
  onBuildingPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  markerLabel: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  markerLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default BuildingCallout;
