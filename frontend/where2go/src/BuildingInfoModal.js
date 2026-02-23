import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import { buildingImages } from './BuildingCallout';
import { colors } from './theme/colors';

const BuildingInfoModal = ({ building, visible, onClose, onSetDeparture, onSetDestination, selectedRole }) => {

  if (!building) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} testID="overlay">
        <Pressable style={styles.modalContainer} onPress={() => { }}>
          {/* Close button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>

          {/* Building image header */}
          {buildingImages[building.code] ? (
            <Image testID="buildingImage"
              source={buildingImages[building.code]}
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.headerImagePlaceholder} testID="imagePlaceholder"/>
          )}

          <ScrollView contentContainerStyle={styles.bodyContent}>
            {/* Building name */}
            <Text style={styles.buildingName}>{building.name}</Text>
            <Text style={styles.buildingCode}>{building.code}</Text>

            {/* Address */}
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.address}>{building.address}</Text>

            {/* Concordia link */}
            <Pressable testID="concordiaLink"
              onPress={() => {
                if (building.link) Linking.openURL(building.link);
              }}
              accessibilityRole="link"
            >
              <Text style={styles.link}>View on Concordia.ca</Text>
            </Pressable>

            {/* Services placeholder */}
            <Text style={styles.sectionTitle}>Services</Text>
            <Text style={styles.servicesPlaceholder}>
              Services info coming soon.
            </Text>

            {/* Select as destination or departure points */}
            <View style={styles.modalBtns} >
              { selectedRole ? (
                <Pressable style={styles.cancelBtnDesign}
                  onPress={() => {
                    if (selectedRole === 'departure') onSetDeparture(null);
                    else onSetDestination(null);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Selected as {selectedRole === 'departure' ? 'Departure' : 'Destination'}. Press again to cancel.</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable style={styles.btnDesign}
                    onPress = { () => {
                      onSetDeparture(building);
                    }}
                  >
                    <Text style={styles.btnsText}>Set as Departure</Text>
                  </Pressable>
                  <Pressable style={styles.btnDesign}
                      onPress = { () => {
                      onSetDestination(building);
                    }}
                  >
                    <Text style={styles.btnsText}>Set as Destination</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

BuildingInfoModal.propTypes = {
  building: PropTypes.shape({
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
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSetDeparture: PropTypes.func.isRequired,
  onSetDestination: PropTypes.func.isRequired,
  selectedRole: PropTypes.string
};

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
    height: SCREEN_HEIGHT * 0.6,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  btnDesign: {
    backgroundColor: '#912338',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
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

export default BuildingInfoModal;
