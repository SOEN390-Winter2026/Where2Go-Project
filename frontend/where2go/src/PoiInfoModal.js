import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { getPlacePhotoUrl } from './utils/placePhotoUrl';
import { colors } from './theme/colors';

/**
 * Modal displaying POI (point of interest) details: photo, name, rating, address, etc.
 * Styled consistently with ErrorModal. Includes "Set as destination" button placeholder.
 */
const NO_ADDRESS_FALLBACK = 'Address not available';

const PoiInfoModal = ({ poi, visible, onClose, onSetAsDestination }) => {
  if (!poi) return null;

  const photoUri = getPlacePhotoUrl(poi.photos?.[0]?.photo_reference);
  const { rating, user_ratings_total: ratingCount, price_level: priceLevel } = poi;
  const address = poi.vicinity ?? poi.formatted_address ?? NO_ADDRESS_FALLBACK;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Photo header */}
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.headerPlaceholder}>
              <Ionicons name="location" size={48} color="#999" />
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <Text style={styles.poiName}>{poi.name}</Text>

            {/* Rating row */}
            {(rating != null || priceLevel != null) && (
              <View style={styles.metaRow}>
                {rating != null && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#f5a623" />
                    <Text style={styles.ratingText}>
                      {rating}
                      {ratingCount != null && (
                        <Text style={styles.ratingCount}> ({ratingCount})</Text>
                      )}
                    </Text>
                  </View>
                )}
                {priceLevel != null && priceLevel > 0 && (
                  <Text style={styles.priceLevel}>
                    {'$'.repeat(priceLevel)}
                  </Text>
                )}
              </View>
            )}

            {/* Address */}
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.address}>{address}</Text>

            {/* Set as destination – pass onSetAsDestination to add functionality */}
            <Pressable
              style={styles.primaryButton}
              onPress={onSetAsDestination ?? (() => {})}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Get directions</Text>
            </Pressable>

            {/* Close secondary button */}
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

PoiInfoModal.propTypes = {
  poi: PropTypes.shape({
    place_id: PropTypes.string,
    name: PropTypes.string,
    vicinity: PropTypes.string,
    formatted_address: PropTypes.string,
    rating: PropTypes.number,
    user_ratings_total: PropTypes.number,
    price_level: PropTypes.number,
    photos: PropTypes.arrayOf(
      PropTypes.shape({
        photo_reference: PropTypes.string,
      })
    ),
    geometry: PropTypes.shape({
      location: PropTypes.shape({
        lat: PropTypes.number,
        lng: PropTypes.number,
      }),
    }),
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSetAsDestination: PropTypes.func,
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerImage: {
    width: '100%',
    height: 180,
  },
  headerPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    maxHeight: 320,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 24,
  },
  poiName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingCount: {
    fontWeight: '400',
    color: '#666',
  },
  priceLevel: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
});

export default PoiInfoModal;
