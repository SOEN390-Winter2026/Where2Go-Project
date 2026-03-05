import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },
  subText: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
  },
  chipText: {
    fontWeight: "900",
    color: "#111",
    fontSize: 12,
  },
  stepList: {
    marginTop: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff5f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#f2d6da",
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  stepSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
});