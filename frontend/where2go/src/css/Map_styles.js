import { StyleSheet } from 'react-native';

export const BURGUNDY = '#6B0F1A';
export const BURGUNDY_LIGHT = '#912338';

export const styles = StyleSheet.create({
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e5e5e5',
    zIndex: 0,
  },
  map: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  stopDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2.5,
    borderColor: BURGUNDY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BURGUNDY,
  },
  boardingPinOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BURGUNDY,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardingPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  startMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: BURGUNDY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMarkerInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BURGUNDY,
  },
  endPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BURGUNDY_LIGHT,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a73e8',
    borderWidth: 3,
    borderColor: 'white',
  },
});