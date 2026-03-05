import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { SEARCHABLE_LOCATIONS } from "../data/locations"; 

const PAGES = {
  HOME: "HOME",
  MAP: "MAP",
  OUTDOOR: "OUTDOOR",
  NEXT: "NEXT",
  POI: "POI",
};

const MODES = ["Walk", "Car", "Transit", "Shuttle"];
const POI_TYPES = ["cafe", "restaurant", "pharmacy", "gym", "bar"];

const normalize = (s) => (s ?? "").trim().toLowerCase();

function isValidBuilding(name) {
  const n = normalize(name);
  return SEARCHABLE_LOCATIONS?.some((b) => normalize(b.name) === n || normalize(b.label) === n);
}

export default function WebTestingShell() {
  const [page, setPage] = useState(PAGES.HOME);

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <Header page={page} onNavigate={setPage} />
        <View style={styles.content}>
          {page === PAGES.HOME && <Home onNavigate={setPage} />}
          {page === PAGES.MAP && <CampusExplorer />}
          {page === PAGES.OUTDOOR && <OutdoorDirections onNavigate={setPage} />}
          {page === PAGES.NEXT && <NextClassGoogleCalendar onNavigate={setPage} />}
          {page === PAGES.POI && <OutdoorPOIs onNavigate={setPage} />}
        </View>
      </View>
    </View>
  );
}

function Header({ page, onNavigate }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.h1}>Where2Go — Sprint 4 Usability Test (Web)</Text>
        <Text style={styles.sub}>
          Web shell for tool-based usability testing. Map rendering is mobile-only; flows are testable here.
        </Text>
      </View>

      <View style={styles.navRow}>
        <NavBtn active={page === PAGES.HOME} 
        onPress={() =>{window.history.pushState({},"","/");
          onNavigate(PAGES.HOME);} } 
          label="Home" />
        <NavBtn active={page === PAGES.MAP} 
        onPress={() =>{window.history.pushState({},"","/map");
          onNavigate(PAGES.MAP);} } 
        label="Explore map" />
        <NavBtn active={page === PAGES.OUTDOOR} 
        onPress={() => {window.history.pushState({},"","/outdoor");
          onNavigate(PAGES.OUTDOOR)}}
        label="Outdoor" />
        <NavBtn active={page === PAGES.NEXT} 
        onPress={() =>{window.history.pushState({},"","/next-class");
          onNavigate(PAGES.NEXT)}} 
        label="Next class" />
        <NavBtn active={page === PAGES.POI} 
        onPress={() =>{window.history.pushState({},"","/pois");
          onNavigate(PAGES.POI)}} 
        label="POIs" />
      </View>
    </View>
  );
}

function NavBtn({ active, onPress, label }) {
  return (
    <Pressable onPress={onPress} style={[styles.navBtn, active && styles.navBtnActive]} accessibilityRole="button">
      <Text style={[styles.navBtnText, active && styles.navBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Home({ onNavigate }) {
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Tasks to test (Sprint 4 Pilot)</Text>
      <Text style={styles.p}>Use this web version to complete the tasks assigned by the team.</Text>

      <View style={styles.taskBox}>
        <Text style={styles.taskTitle}>Task 1 — Explore campus map</Text>
        <Text style={styles.p}>Switch campuses and open building info.</Text>
        <Pressable style={styles.primary} onPress={() => onNavigate(PAGES.MAP)} accessibilityRole="button">
          <Text style={styles.primaryText}>Start Task 1</Text>
        </Pressable>
      </View>

      <View style={styles.taskBox}>
        <Text style={styles.taskTitle}>Task 2 — Outdoor directions</Text>
        <Text style={styles.p}>Select start/destination and transportation mode.</Text>
        <Pressable style={styles.primary} onPress={() => onNavigate(PAGES.OUTDOOR)} accessibilityRole="button">
          <Text style={styles.primaryText}>Start Task 2</Text>
        </Pressable>
      </View>

      <View style={styles.taskBox}>
        <Text style={styles.taskTitle}>Task 3 — Directions to next class (Google Calendar)</Text>
        <Text style={styles.p}>Connect calendar, choose calendar, generate directions.</Text>
        <Pressable style={styles.primary} onPress={() => onNavigate(PAGES.NEXT)} accessibilityRole="button">
          <Text style={styles.primaryText}>Start Task 3</Text>
        </Pressable>
      </View>

      <View style={styles.taskBox}>
        <Text style={styles.taskTitle}>Task 4 — Outdoor POIs</Text>
        <Text style={styles.p}>Find nearest POI type and open directions to it.</Text>
        <Pressable style={styles.primary} onPress={() => onNavigate(PAGES.POI)} accessibilityRole="button">
          <Text style={styles.primaryText}>Start Task 4</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Requirement 1 flow (toggle campus, find building, view info, "current location") */
function CampusExplorer() {
  const [campus, setCampus] = useState("SGW");
  const [building, setBuilding] = useState("");
  const [current, setCurrent] = useState("Hall");
  const [showInfo, setShowInfo] = useState(false);

  const valid = building.length === 0 ? false : isValidBuilding(building);

  return (
    <ScrollView contentContainerStyle={styles.card}>
      <Text style={styles.h2}>Explore campus map (Flow)</Text>

      <Text style={styles.label}>Campus</Text>
      <View style={styles.row}>
        {["SGW", "Loyola"].map((c) => (
          <Pressable
            key={c}
            onPress={() => setCampus(c)}
            style={[styles.chip, campus === c && styles.chipActive]}
            accessibilityRole="button"
          >
            <Text>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>“I am currently at…”</Text>
      <TextInput style={styles.input} value={current} onChangeText={setCurrent} placeholder="e.g., Hall" />
      <Pressable style={styles.secondary} onPress={() => setShowInfo(true)} accessibilityRole="button">
        <Text style={styles.secondaryText}>Show my current building</Text>
      </Pressable>

      <Text style={styles.label}>Search building</Text>
      <TextInput style={styles.input} value={building} onChangeText={setBuilding} placeholder="Type a building name" />

      <Pressable
        style={[styles.primary, !valid && styles.disabled]}
        disabled={!valid}
        onPress={() => setShowInfo(true)}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Open building info</Text>
      </Pressable>

      {showInfo && (
        <View style={styles.panel} accessibilityLabel="building-info-panel">
          <Text style={styles.h3}>Building info</Text>
          <Text style={styles.p}>Campus: {campus}</Text>
          <Text style={styles.p}>Selected: {valid ? building : current}</Text>
          <Pressable style={styles.link} onPress={() => setShowInfo(false)} accessibilityRole="button">
            <Text style={styles.linkText}>Close</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

/** Requirement 2 flow */
function OutdoorDirections({ onNavigate }) {
  const [start, setStart] = useState("");
  const [dest, setDest] = useState("");
  const [useCurrent, setUseCurrent] = useState(false);
  const [mode, setMode] = useState("Walk");
  const [generated, setGenerated] = useState(false);

  const startOk = useCurrent || isValidBuilding(start);
  const destOk = isValidBuilding(dest);

  return (
    <ScrollView contentContainerStyle={styles.card}>
      <Text style={styles.h2}>Outdoor directions (Flow)</Text>

      <Text style={styles.label}>Start</Text>
      <TextInput style={styles.input} value={start} onChangeText={setStart} placeholder="e.g., Hall" editable={!useCurrent} />
      <Pressable style={styles.checkboxRow} onPress={() => setUseCurrent((v) => !v)} accessibilityRole="button">
        <View style={[styles.checkbox, useCurrent && styles.checkboxChecked]} />
        <Text>Use my current location as start</Text>
      </Pressable>

      <Text style={styles.label}>Destination</Text>
      <TextInput style={styles.input} value={dest} onChangeText={setDest} placeholder="e.g., JMSB" />

      <Text style={styles.label}>Mode</Text>
      <View style={styles.row}>
        {MODES.map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.chip, mode === m && styles.chipActive]} accessibilityRole="button">
            <Text>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.primary, !(startOk && destOk) && styles.disabled]}
        disabled={!(startOk && destOk)}
        onPress={() => setGenerated(true)}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Generate directions</Text>
      </Pressable>

      {generated && (
        <View style={styles.panel} accessibilityLabel="directions-panel">
          <Text style={styles.h3}>Directions</Text>
          <Text style={styles.p}>Start: {useCurrent ? "Current location" : start}</Text>
          <Text style={styles.p}>Destination: {dest}</Text>
          <Text style={styles.p}>Mode: {mode}</Text>
          <Text style={styles.p}>Map visualization is available on mobile; this confirms the flow.</Text>

          <Pressable style={styles.secondary} onPress={() => onNavigate("POI")} accessibilityRole="button">
            <Text style={styles.secondaryText}>Go test POIs</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

/** Requirement 3 (Google Calendar) flow */
function NextClassGoogleCalendar({ onNavigate }) {
  const [connected, setConnected] = useState(false);
  const [calendar, setCalendar] = useState("");
  const [generated, setGenerated] = useState(false);

  const calendars = ["Concordia Courses", "Personal", "Work"];
  const calendarOk = calendar.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.card}>
      <Text style={styles.h2}>Directions to my next class (Google Calendar)</Text>

      <Pressable
        style={[styles.primary, connected && styles.disabled]}
        disabled={connected}
        onPress={() => setConnected(true)}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>{connected ? "Calendar connected" : "Connect Google Calendar"}</Text>
      </Pressable>

      <Text style={styles.label}>Select calendar</Text>
      <View style={styles.row}>
        {calendars.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCalendar(c)}
            style={[styles.chip, calendar === c && styles.chipActive, !connected && styles.disabledChip]}
            disabled={!connected}
            accessibilityRole="button"
          >
            <Text>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.secondary, !(connected && calendarOk) && styles.disabled]}
        disabled={!(connected && calendarOk)}
        onPress={() => setGenerated(true)}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Find next class</Text>
      </Pressable>

      {generated && (
        <View style={styles.panel} accessibilityLabel="next-class-panel">
          <Text style={styles.h3}>Next class (Preview)</Text>
          <Text style={styles.p}>Calendar: {calendar}</Text>
          <Text style={styles.p}>Next event: SOEN 390 — Hall Building (example)</Text>

          <Pressable style={styles.primary} onPress={() => onNavigate("OUTDOOR")} accessibilityRole="button">
            <Text style={styles.primaryText}>Generate directions</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

/** Requirement 6 flow */
function OutdoorPOIs({ onNavigate }) {
  const [type, setType] = useState("cafe");
  const [generated, setGenerated] = useState(false);

  const fakeResults = useMemo(
    () => [
      { name: "Café A", vicinity: "Near Hall Building" },
      { name: "Café B", vicinity: "Near JMSB" },
      { name: "Café C", vicinity: "Near Guy-Concordia" },
    ],
    []
  );

  return (
    <ScrollView contentContainerStyle={styles.card}>
      <Text style={styles.h2}>Outdoor POIs (Flow)</Text>

      <Text style={styles.label}>POI type</Text>
      <View style={styles.row}>
        {POI_TYPES.map((t) => (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]} accessibilityRole="button">
            <Text>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primary} onPress={() => setGenerated(true)} accessibilityRole="button">
        <Text style={styles.primaryText}>Show nearest {type}</Text>
      </Pressable>

      {generated && (
        <View style={styles.panel} accessibilityLabel="poi-results-panel">
          <Text style={styles.h3}>Results</Text>
          {fakeResults.map((r) => (
            <View key={r.name} style={styles.resultRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{r.name}</Text>
                <Text style={styles.p}>{r.vicinity}</Text>
              </View>
              <Pressable
                style={styles.link}
                onPress={() => onNavigate("OUTDOOR")}
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Directions</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f6f6f6", padding: 18 },
  shell: { flex: 1, maxWidth: 980, width: "100%", alignSelf: "center" },
  header: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
    marginBottom: 12,
  },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#ddd" },
  navBtnActive: { borderColor: "#912338" },
  navBtnText: { fontSize: 12 },
  navBtnTextActive: { fontWeight: "700" },

  content: { flex: 1 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#eee", backgroundColor: "white", gap: 10 },
  taskBox: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", gap: 8 },
  taskTitle: { fontSize: 13, fontWeight: "700" },

  h1: { fontSize: 16, fontWeight: "800" },
  h2: { fontSize: 14, fontWeight: "800" },
  h3: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
  sub: { marginTop: 4, fontSize: 12, color: "#555" },
  p: { fontSize: 12, color: "#444", lineHeight: 18 },

  label: { marginTop: 6, fontSize: 12, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 12 },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { borderColor: "#912338" },
  disabledChip: { opacity: 0.4 },

  primary: { backgroundColor: "#912338", padding: 12, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "800" },
  secondary: { borderWidth: 1, borderColor: "#912338", padding: 12, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#912338", fontWeight: "800" },
  disabled: { opacity: 0.45 },

  panel: { marginTop: 6, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa" },
  checkboxRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: "#999", borderRadius: 4 },
  checkboxChecked: { backgroundColor: "#912338", borderColor: "#912338" },

  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#eee" },
  resultTitle: { fontSize: 13, fontWeight: "700" },

  link: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#ddd" },
  linkText: { fontSize: 12, fontWeight: "700" },
});