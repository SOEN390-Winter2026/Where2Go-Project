import { StyleSheet, Platform } from "react-native";


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: "#912338",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  form: {
    padding: 20,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginTop: 16,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  timeFieldWrap: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  timeInput: {
    textAlign: "center",
  },
  timeArrow: {
    marginBottom: 14,
  },
  locationWrap: {
    position: "relative",
  },
  roomInput: {
    marginTop: 8,
  },
  clearBtn: {
    marginLeft: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#912338",
    alignItems: "center",
  },
  cancelTxt: {
    color: "#912338",
    fontSize: 15,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#912338",
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveTxt: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#c0392b",
  },
  errorText: {
    color: "#c0392b",
    fontSize: 12,
    marginTop: 4,
  },
});

export default styles;