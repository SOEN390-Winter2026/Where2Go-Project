import { StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    tabBar: {
        flexGrow: 0,
        borderBottomWidth: 1,
        borderColor: '#e5e5e5',
    },
    tabBarContent: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    tabActive: {
        backgroundColor: '#8B0000',
    },
    tabText: {
        fontSize: 13,
        color: '#555',
    },
    tabTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    mapImage: {
        width: SCREEN_WIDTH,
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#999',
        fontSize: 14,
    },
    placeholderText: {
        color: '#bbb',
        fontSize: 14,
    },
    noDataBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#f0ad4e',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    noDataText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
});