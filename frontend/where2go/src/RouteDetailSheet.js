import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function TransitChip({ text }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

export default function RouteDetailsSheet({ route, onClose }) {
  if (!route) return null;

  const steps = Array.isArray(route.steps) ? route.steps : [];

  const chips =
    route.mode === "transit"
      ? steps
          .filter((s) => s.type === "transit" && s.line)
          .map((s) => s.line)
          .slice(0, 6)
      : [];

  const headerIcon = route.mode === "walking" ? "walk" : route.mode === "transit" ? "bus" : "navigate";

  return (
    <View style={styles.sheet}>
      <View style={styles.topRow}>
        <Ionicons name={headerIcon} size={20} color="#6b0f1a" />
        <Text style={styles.timeText}>{route.duration?.text ?? "—"}</Text>

        <View style={{ flex: 1 }} />

        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color="#6b0f1a" />
        </Pressable>
      </View>

      {route.distance?.text && (
        <Text style={styles.subText}>{route.distance.text}</Text>
      )}

      {chips.length > 0 && (
        <View style={styles.chipRow}>
          {chips.map((c, i) => (
            <TransitChip key={`${c}-${i}`} text={c} />
          ))}
        </View>
      )}

      {/* Steps list */}
      {steps.length > 0 && (
        <View style={{ marginTop: 10 }}>
          {steps.map((s, idx) => {
            const icon =
              s.type === "walk" ? "walk" : s.vehicle === "subway" ? "subway" : "bus";

            const title =
              s.type === "walk"
                ? `Walk • ${s.durationText ?? ""}`
                : `${s.vehicle === "subway" ? "Metro" : "Bus"} ${s.line ? `• ${s.line}` : ""}${
                    s.durationText ? ` • ${s.durationText}` : ""
                  }`;

            const sub =
              s.type === "walk"
                ? (s.distanceText ?? "")
                : `${s.from ?? ""}${s.to ? ` → ${s.to}` : ""}${
                    s.stops != null ? ` • ${s.stops} stops` : ""
                  }`;

            return (
              <View key={`step-${idx}`} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Ionicons name={icon} size={18} color="#6b0f1a" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  {!!sub && <Text style={styles.stepSub}>{sub}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
