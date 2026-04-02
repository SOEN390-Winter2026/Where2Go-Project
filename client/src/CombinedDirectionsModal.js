import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import PropTypes from "prop-types";

const segmentShape = PropTypes.shape({
  kind: PropTypes.oneOf(["indoor", "outdoor"]).isRequired,
  summary: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.string),
  buildingCode: PropTypes.string,
  durationText: PropTypes.string,
  distanceText: PropTypes.string,
});

export default function CombinedDirectionsModal({
  visible,
  onClose,
  loading,
  errorMessage,
  segments,
}) {
  const segmentCounts = new Map();
  const segmentKey = (seg) => {
    const base = [
      seg.kind,
      seg.buildingCode || "none",
      seg.summary || "segment",
      seg.durationText || "",
      seg.distanceText || "",
      (seg.steps || []).join("|"),
    ].join("|");
    const next = (segmentCounts.get(base) || 0) + 1;
    segmentCounts.set(base, next);
    return `${base}#${next}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Directions</Text>

          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#912338" />
              <Text style={styles.muted}>Building your route…</Text>
            </View>
          )}

          {!loading && errorMessage && (
            <Text style={styles.error}>{errorMessage}</Text>
          )}

          {!loading && !errorMessage && segments?.length > 0 && (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {segments.map((seg, i) => (
                <View key={segmentKey(seg)} style={styles.segment}>
                  <Text style={styles.segmentBadge}>
                    {seg.kind === "indoor" ? "Indoor" : "Outdoor"}{" "}
                    {i + 1}/{segments.length}
                  </Text>
                  <Text style={styles.segmentTitle}>{seg.summary}</Text>
                  {seg.kind === "outdoor" && (seg.durationText || seg.distanceText) ? (
                    <Text style={styles.meta}>
                      {[seg.distanceText, seg.durationText].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                  {seg.kind === "outdoor"
                    ? (() => {
                        const stepCounts = new Map();
                        return (seg.steps || []).map((line) => {
                          const text = String(line);
                          const seen = (stepCounts.get(text) || 0) + 1;
                          stepCounts.set(text, seen);
                          return (
                            <Text key={`${text}#${seen}`} style={styles.stepLine}>
                              • {line}
                            </Text>
                          );
                        });
                      })()
                    : null}
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

CombinedDirectionsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  errorMessage: PropTypes.string,
  segments: PropTypes.arrayOf(segmentShape),
};

CombinedDirectionsModal.defaultProps = {
  loading: false,
  errorMessage: null,
  segments: null,
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  center: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  muted: {
    color: "#888",
    fontSize: 14,
  },
  error: {
    color: "#b00020",
    fontSize: 15,
    marginBottom: 12,
  },
  scroll: { maxHeight: 420 },
  scrollContent: { paddingBottom: 12 },
  segment: {
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#912338",
    paddingLeft: 12,
  },
  segmentBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#912338",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  stepLine: {
    fontSize: 14,
    color: "#444",
    marginTop: 4,
    lineHeight: 20,
  },
  closeBtn: {
    marginTop: 8,
    backgroundColor: "#912338",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
