import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    sheetCampus: {
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    backBtnText: {
        fontWeight: '600',
        color: '#912338',
    },

    mapArea: {
        flex: 1,
    },
    mapPlaceholderSub: {
        color: '#aaa',
        fontStyle: 'italic',
    },

    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: '#ccc',
        marginTop: 8,
    },

    floorLayersContainer: {
        flex: 1,
        width: '100%',
    },

    zoomableContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    zoomableAnimatedView: {
        flex: 1,
        overflow: 'hidden',
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },

    // Classroom label overlayy
    roomLabel: {
        position: 'absolute',
        backgroundColor: '#912338',
        borderWidth: 0.8,
        borderColor: '#fff',
        borderRadius: 2,
        paddingHorizontal: 2,
        paddingVertical: 1,
        marginLeft: -18,
        marginTop: -6,
    },
    roomLabelText: {
        fontSize: 6,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        maxWidth: 36,
    },

    // Room action modal
    roomModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    roomModalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
        gap: 4,
    },
    roomModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#912338',
        textAlign: 'center',
        marginBottom: 12,
    },
    roomModalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    roomModalBtnText: {
        fontSize: 15,
        color: '#912338',
        fontWeight: '600',
    },
    roomModalBtnCancel: {
        borderBottomWidth: 0,
        justifyContent: 'center',
        marginTop: 4,
    },
    roomModalBtnCancelText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        width: '100%',
    },

    navUnavailableBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: '#f0ad4e',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    navUnavailableText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },

    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#912338',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        zIndex: 10,
        elevation: 10,
    },
    dragArea: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 12,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginBottom: 8,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 25,
    },
    barSide: {
        flex: 1,
        alignItems: 'flex-start',
    },
    barSideRight: {
        alignItems: 'flex-end',
    },
    barCenter: {
        flex: 2,
        alignItems: 'center',
    },
    sheetSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 0.5,
    },
    sheetTitle: {
        fontWeight: '800',
        color: '#fff',
    },
    tabBtn: {
        padding: 6,
    },
    sheetContent: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 14,
        padding: 16,
        gap: 6,
    },
    sheetScrollView: {
        flex: 1,
    },
    sheetScrollContent: {
        paddingBottom: 16,
    },

    classroomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    classroomLabel: {
        fontWeight: '600',
        color: '#333',
    },
    classroomInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#f5f5f5',
    },

    floorBtnsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    floorBtn: {
        backgroundColor: '#912338',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floorBtnActive: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#912338',
    },
    floorBtnText: {
        fontWeight: '700',
        color: '#fff',
    },
    floorBtnTextActive: {
        color: '#912338',
    },

    infoLabel: {
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 6,
    },
    infoValue: {
        color: '#333',
        fontWeight: '500',
    },

    takeToDirectionsBtn: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 14,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#912338',
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
    },
    takeToDirectionsBtnText: {
        color: '#912338',
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    directionsSectionTitle: {
        fontWeight: '800',
        color: '#912338',
        textAlign: 'center',
        marginBottom: 4,
    },
    directionsGroupLabel: {
        fontWeight: '700',
        color: '#333',
        marginTop: 6,
        marginBottom: 4,
    },
    directionsRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
    },
    swapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        gap: 8,
    },
    swapLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    swapBtn: {
        backgroundColor: '#912338',
        borderRadius: 20,
        padding: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
    },
    generateDirectionsBtn: {
        marginTop: 14,
        backgroundColor: '#912338',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
    },
    generateDirectionsBtnText: {
        color: '#fff',
        fontWeight: '700',
        letterSpacing: 0.4,
    },

    dropdownWrapper: {
        flex: 1,
        gap: 4,
    },
    dropdownLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: '#912338',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 7,
        backgroundColor: '#fff',
    },
    dropdownBtnDisabled: {
        borderColor: '#ddd',
        backgroundColor: '#f7f7f7',
    },
    dropdownBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#912338',
    },
    dropdownBtnPlaceholder: {
        color: '#bbb',
        fontWeight: '400',
    },
    dropdownOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    dropdownModal: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        width: '80%',
        maxHeight: 280,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    dropdownModalTitle: {
        fontWeight: '700',
        fontSize: 14,
        color: '#912338',
        marginBottom: 10,
        textAlign: 'center',
    },
    dropdownOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 2,
    },
    dropdownOptionActive: {
        backgroundColor: '#912338',
    },
    dropdownOptionText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    dropdownOptionActiveText: {
        color: '#fff',
        fontWeight: '700',
    },

    zoomControls: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 10,
        outlineWidth: 2,
        outlineColor: '#912338',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    zoomBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomBtnPressed: {
        backgroundColor: 'rgba(145,35,56,0.08)',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginHorizontal: 6,
    },
    badge: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
        pointerEvents: 'none',
    },
    floorLabelText: {
        backgroundColor: '#912338',
        color: '#ffff',
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        overflow: 'hidden',
    },
        instructionsWrap: {
        marginTop: 4,
        gap: 12,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    instructionStepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#912338',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    instructionStepBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    instructionTextWrap: {
        flex: 1,
        backgroundColor: '#f8f3f5',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    instructionText: {
        color: '#333',
        fontWeight: '500',
        lineHeight: 20,
    },
});

export default styles;