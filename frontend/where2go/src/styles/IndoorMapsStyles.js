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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    mapPlaceholderSub: {
        color: '#aaa',
        fontStyle: 'italic',
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
        backgroundColor: '#6b0f1a',
        borderWidth: 2,
        borderColor: '#fff',
    },
    floorBtnText: {
        fontWeight: '700',
        color: '#fff',
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
});

export default styles;