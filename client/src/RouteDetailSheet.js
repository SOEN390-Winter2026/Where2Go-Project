import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { styles } from "./styles/routeDetailsSheet_styles";

const ICON_COLOR = "#6b0f1a";

function getHeaderIcon(mode) {
  if (mode === "walking") return "walk";
  if (mode === "transit") return "bus";
  return "navigate";
}

function getTransitChips(mode, steps) {
  if (mode !== "transit") return [];
  return steps
    .filter((s) => s.type === "transit" && s.line)
    .map((s) => s.line)
    .slice(0, 6);
}

function getStepIcon(step) {
  if (step.type === "walk") return "walk";
  if (step.vehicle === "subway") return "subway";
  return "bus";
}

function getStepTitle(step) {
  if (step.type === "walk") {
    return `Walk • ${step.durationText ?? ""}`;
  }
  const vehicle = step.vehicle === "subway" ? "Metro" : "Bus";
  const line = step.line ? `• ${step.line}` : "";
  const duration = step.durationText ? ` • ${step.durationText}` : "";
  return `${vehicle} ${line}${duration}`;
}

function getStepSub(step) {
  if (step.type === "walk") {
    return step.distanceText ?? "";
  }
  const from = step.from ?? "";
  const to = step.to ? ` → ${step.to}` : "";
  const stops = step.stops == null ? "" : ` • ${step.stops} stops`;
  return `${from}${to}${stops}`;
}

const stepShape = PropTypes.shape({
  type: PropTypes.string.isRequired,
  vehicle: PropTypes.string,
  line: PropTypes.string,
  durationText: PropTypes.string,
  distanceText: PropTypes.string,
  from: PropTypes.string,
  to: PropTypes.string,
  stops: PropTypes.number,
});

function TransitChip({ text }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

TransitChip.propTypes = {
  text: PropTypes.string.isRequired,
};

function StepRow({ step }) {
  const icon = getStepIcon(step);
  const title = getStepTitle(step);
  const sub = getStepSub(step);

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIcon}>
        <Ionicons name={icon} size={18} color={ICON_COLOR} />
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        {!!sub && <Text style={styles.stepSub}>{sub}</Text>}
      </View>
    </View>
  );
}

StepRow.propTypes = {
  step: stepShape.isRequired,
};

RouteDetailsSheet.propTypes = {
  route: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    duration: PropTypes.shape({ text: PropTypes.string }),
    distance: PropTypes.shape({ text: PropTypes.string }),
    steps: PropTypes.arrayOf(stepShape),
  }),
  onClose: PropTypes.func.isRequired,
};

export default function RouteDetailsSheet({ route, onClose }) {
  if (!route) return null;

  const steps = Array.isArray(route.steps) ? route.steps : [];
  const chips = getTransitChips(route.mode, steps);
  const headerIcon = getHeaderIcon(route.mode);

  return (
    <View style={styles.sheet}>
      <View style={styles.topRow}>
        <Ionicons name={headerIcon} size={20} color={ICON_COLOR} />
        <Text style={styles.timeText}>{route.duration?.text ?? "—"}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={ICON_COLOR} />
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

      {steps.length > 0 && (
        <View style={styles.stepList}>
          {steps.map((s, idx) => (
            <StepRow key={`step-${idx}`} step={s} />
          ))}
        </View>
      )}
    </View>
  );
}