import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
  Image,
  ScrollView,
} from "react-native";
import Constants from "expo-constants";
import { Icon } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import PotluckButton from "./PotluckButton";
import { colors } from "../constants/colors";
import { loadReadings, dayKey } from "../lib/readings";

const SAVOR_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes";
const PRIVACY_URL = "https://getsavor.recipes/privacy";
const COFFEE_URL  = "https://buymeacoffee.com/calicosquid";


// "Today" / "Yesterday" / weekday name for a reading entry.
const relDay = (entry) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (entry.date === dayKey())  return "Today";
  if (entry.date === dayKey(y)) return "Yesterday";
  return new Date(entry.ts).toLocaleDateString(undefined, { weekday: "long" });
};

// Calendar-day age, 0 (today) … 6 (final visible day before the prune).
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const ageDays = (entry) =>
  Math.max(0, Math.round((startOfDay(Date.now()) - startOfDay(entry.ts)) / 86400000));

// Old-Polaroid bleach: the photo washes toward cream as the memory fades.
// Floored at BLEACH_MAX so it never fully vanishes while still in the list —
// the name stays full-contrast and tappable the whole time.
const BLEACH_MAX = 0.6;
const bleachFor = (age) => (Math.min(age, 6) / 6) * BLEACH_MAX;

const AboutSheet = ({ visible, onClose }) => {
  const version = Constants.expoConfig?.version || "";
  const navigation = useNavigation();

  const [readings, setReadings] = useState([]);
  const [tab, setTab] = useState("about"); // "week" | "about"

  // Refresh the log each time the sheet opens; land on the readings when
  // there are any, otherwise the About copy.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadReadings()
      .then((list) => {
        if (cancelled) return;
        setReadings(list);
        setTab(list.length ? "week" : "about");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible]);

  const hasReadings = readings.length > 0;

  const openReading = (recipe) => {
    onClose();
    navigation.push("Recipe", { recipe });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.notch} />

          {hasReadings && (
            <View style={styles.tabs}>
              {[
                { key: "week",  label: "This Week" },
                { key: "about", label: "About" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={styles.tab}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                    {t.label}
                  </Text>
                  {tab === t.key && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {tab === "week" && hasReadings ? (
            <View>
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {readings.map((entry) => {
                  const age    = ageDays(entry);
                  const bleach = bleachFor(age);
                  return (
                  <TouchableOpacity
                    key={entry.date}
                    style={styles.readingRow}
                    onPress={() => openReading(entry.recipe)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.thumbWrap}>
                      {entry.recipe?.image ? (
                        <Image source={{ uri: entry.recipe.image }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, styles.thumbFallback]}>
                          <Text style={{ fontSize: 20 }}>🍽️</Text>
                        </View>
                      )}
                      {bleach > 0 && (
                        <View pointerEvents="none" style={[styles.bleach, { opacity: bleach }]} />
                      )}
                    </View>
                    <View style={styles.readingText}>
                      <Text style={styles.readingName} numberOfLines={1}>
                        {entry.recipe?.name}
                      </Text>
                      <View style={styles.readingMeta}>
                        <Text style={styles.readingDay}>{relDay(entry)}</Text>
                        {age >= 6 && <Text style={styles.fadingTag}>· fading today</Text>}
                      </View>
                    </View>
                    <Icon source="chevron-right" size={20} color={colors.teal} />
                  </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fade}>
                Readings fade after a week. Liked one? Save it to Savor before it's gone.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>What is this?</Text>

              <Text style={styles.body}>
                You spin, the universe picks, you cook. No feed, no algorithm, nothing
                to agonise over. That's the whole app.
              </Text>
              <Text style={styles.body}>
                Potluck is a small thing made by the people behind{" "}
                <Text style={styles.bodyStrong}>Savor</Text> — a proper recipe app for
                people who'd rather cook than scroll. Every recipe here comes from the
                Savor community.
              </Text>

              <PotluckButton
                imageIcon={require("../../assets/savor-logo.png")}
                title="Get Savor — it's free"
                subtitle="Your own recipe box. No subscription to start."
                onPress={() => Linking.openURL(SAVOR_STORE_URL).catch(() => {})}
              />

              <View style={styles.links}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(COFFEE_URL).catch(() => {})}
                  hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.link}>☕ Buy me a coffee</Text>
                </TouchableOpacity>
                <View style={styles.linkDivider} />
                <TouchableOpacity
                  onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
                  hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.link}>Privacy</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.credit}>
                Made by CalicoSquid{version ? ` · v${version}` : ""}
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,40,41,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 40,
  },
  notch: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.orange + "60", marginBottom: 14 },

  // ── Tabs ──────────────────────────────────────────────────────────────
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, position: "relative" },
  tabLabel: { fontFamily: "RalewaySemiBold", fontSize: 15, color: colors.teal, opacity: 0.4 },
  tabLabelActive: { opacity: 1 },
  tabUnderline: { position: "absolute", bottom: -1, left: "25%", right: "25%", height: 3, borderRadius: 2, backgroundColor: colors.orange },

  // ── Readings list ─────────────────────────────────────────────────────
  list: { maxHeight: 320 },
  readingRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  thumbWrap: { width: 52, height: 52, borderRadius: 12, overflow: "hidden" },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.border },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  bleach: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFF8F4" },
  readingText: { flex: 1 },
  readingName: { fontFamily: "RalewayBold", fontSize: 15, color: colors.teal, lineHeight: 20 },
  readingMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  readingDay: { fontFamily: "Raleway", fontSize: 12, color: colors.teal, opacity: 0.5 },
  fadingTag: { fontFamily: "RalewaySemiBold", fontSize: 12, color: colors.orange, opacity: 0.85 },
  fade: { fontFamily: "Raleway", fontSize: 12, lineHeight: 18, color: colors.teal, opacity: 0.5, textAlign: "center", marginTop: 16 },

  // ── About ─────────────────────────────────────────────────────────────
  title: { fontFamily: "RalewayBold", fontSize: 22, color: colors.teal, marginBottom: 10 },
  body: { fontFamily: "Raleway", fontSize: 14, lineHeight: 21, color: colors.teal, opacity: 0.7, marginBottom: 12 },
  bodyStrong: { fontFamily: "RalewayBold" },
  links: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 6 },
  link: { fontFamily: "RalewaySemiBold", fontSize: 13, color: colors.teal, opacity: 0.55 },
  linkDivider: { width: 1, height: 12, backgroundColor: colors.teal, opacity: 0.2 },
  credit: { fontFamily: "Raleway", fontSize: 11, color: colors.teal, opacity: 0.4, textAlign: "center", marginTop: 14, letterSpacing: 0.3 },
});

export default AboutSheet;