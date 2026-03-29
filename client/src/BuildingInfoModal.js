import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import PropTypes from 'prop-types';
import { buildingImages } from './BuildingCallout';
import styles from "./styles/BuildingInfoModal_styles";

const BuildingInfoModal = ({ building, visible, onClose, onSetDeparture, onSetDestination, onGoInside, selectedRole }) => {
  const bottomPadding = Platform.OS === 'android' ? 24 : 16;

  if (!building) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
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
            <View style={[styles.modalBtns, { paddingBottom: bottomPadding }]}>
              {selectedRole ? (
                <Pressable
                  style={styles.cancelBtnDesign}
                  onPress={() => {
                    if (selectedRole === 'departure') onSetDeparture(null);
                    else onSetDestination(null);
                  }}
                >
                  <Text style={styles.cancelBtnText}>
                    Selected as {selectedRole === 'departure' ? 'Departure' : 'Destination'}. Press again to cancel.
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.topBtnsRow}>
                  <Pressable style={styles.btnDesign} onPress={() => onSetDeparture(building)}>
                    <Text style={styles.btnsText}>Set as Departure</Text>
                  </Pressable>
                  <Pressable style={styles.btnDesign} onPress={() => onSetDestination(building)}>
                    <Text style={styles.btnsText}>Set as Destination</Text>
                  </Pressable>
                </View>
              )}

              <Pressable style={styles.goInsideBtn} onPress={() => onGoInside(building)}>
                <Text style={styles.goInsideBtnText}>Go inside <Ionicons size={20} name="log-in-outline"></Ionicons></Text>
              </Pressable>
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
  onGoInside: PropTypes.func.isRequired,
  selectedRole: PropTypes.string
};

export default BuildingInfoModal;