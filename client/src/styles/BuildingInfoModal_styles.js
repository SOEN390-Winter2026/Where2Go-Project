import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.65,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 14,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerImage: {
    width: '100%',
    height: 180,
  },
  headerImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#6b0f1a',
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  buildingName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  buildingCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: '#1a73e8',
    marginTop: 4,
    marginBottom: 8,
  },
  servicesPlaceholder: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalBtns: {
    flexDirection: 'column',
    paddingVertical: 24,
    gap: 12,
  },
  topBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnDesign: {
    backgroundColor: '#912338',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
  },
  goInsideBtnText : {
    color: '#912338',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  goInsideBtn: {
    backgroundColor: 'white',
    borderColor: '#912338',
    borderWidth: 3,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
  },
  btnsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelBtnDesign: {
    borderColor: '#912338',
    borderWidth: 3,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    flex: 1
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  }
});
export default styles;