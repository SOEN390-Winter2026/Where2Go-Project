import { StyleSheet, Dimensions } from "react-native";

const { height, width } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.6;

export const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 100,
    backgroundColor: "#912338",
    paddingTop: 35,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonModalUp: {
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    position: "absolute",
    bottom: 25,
    right: 15,
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    justifyContent: "center",
    flexDirection: "column",
    gap: 20,
  },
  handle: {
    width: 50,
    height: 6,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    position: "absolute",
    top: 10,
    marginBottom: 15,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 12,
  },

  googleCalBtn: {
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  manualBtn: {
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btnTxt: { color: "white", fontWeight: "bold" },

  calendar: {
    width: 150,
    height: 150,
    marginBottom: 10,
    borderRadius: 45,
  },
  txtNoCal: { fontSize: 30, fontWeight: "700" },
  noCalContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 220,
  },

  titleView: {
    backgroundColor: "#912338",
    width: width,
    justifyContent: "center",
    alignItems: "center",
  },
  txtTitle: {
    color: "white",
    fontSize: 18,
    bottom: 30,
    fontWeight: "800",
    fontFamily: "Helvetica Neue",
  },
  selectCalView: {
    flex: 1,
    width: "100%",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  txtSelectCal: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Helvetica Neue",
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  checkboxLabel: { marginLeft: 10, fontSize: 16 },
  saveBtn: {
    backgroundColor: "#912338",
    padding: 15,
    borderRadius: 10,
    marginTop: 50,
    alignItems: "center",
  },

  /* -------- Calendar page -------- */
  pageWrap: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 18,
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: "#E9E9E9",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 10,
  },
  calendarTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  upcomingTitle: {
    marginTop: 14,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  upcomingBox: {
    borderWidth: 1,
    borderColor: "#E9E9E9",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxHeight: height * 0.36,
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 6,
    borderRadius: 10,
  },
  leftAccent: {
    width: 3,
    height: "70%",
    backgroundColor: "#912338",
    borderRadius: 4,
    marginRight: 10,
    marginLeft: 6,
  },
  dateCol: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "900",
    color: "#912338",
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: "900",
    color: "#912338",
    marginTop: 2,
  },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, fontWeight: "900", color: "#111" },
  eventTime: {
    marginTop: 2,
    fontSize: 12,
    color: "#333",
    fontWeight: "800",
  },
  eventMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
    fontWeight: "700",
  },
  eventLoc: {
    marginTop: 2,
    fontSize: 12,
    color: "#444",
    fontWeight: "700",
  },

  emptyWrap: { padding: 12 },
  emptyTitle: { fontWeight: "900", fontSize: 13, color: "#111" },
  emptySub: { marginTop: 4, color: "#666", fontWeight: "600" },

  /* -------- Selected calendars modal -------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  selectedCalsModal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
  },
  selectedCalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  selectedCalsTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },
  selectedCalsList: {
    maxHeight: 220,
  },
  selectedCalsEmpty: {
    color: "#666",
    fontWeight: "700",
    marginVertical: 6,
  },
  calRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  calName: {
    flex: 1,
    fontWeight: "800",
    color: "#222",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 14,
    justifyContent: "flex-end",
    gap: 10,
  },
  changeBtn: {
    backgroundColor: "#912338",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  changeBtnTxt: {
    color: "#fff",
    fontWeight: "900",
  },
  disconnectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  disconnectBtnTxt: {
    color: "#666",
    fontWeight: "600",
  },
});

