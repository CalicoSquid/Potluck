import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { setTodaysReading } from "../lib/readings";
import TonightButton from "../components/TonightButton";
import PotluckHeader from "../components/PotluckHeader";
import { Icon } from "react-native-paper";

const BRAND = { teal: "#142829", orange: "#FF9800", border: "#f0ebe6" };

const SAVOR_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes";

const pick = (a) => a[Math.floor(Math.random() * a.length)];

const sumTime = (t) => (t ? (t.hours || 0) * 60 + (t.minutes || 0) : 0);
const fmtTime = (r) => {
  const m =
    sumTime(r?.times?.total) ||
    sumTime(r?.times?.prep) + sumTime(r?.times?.cook);
  if (!m) return null;
  return m < 60
    ? `${m} min`
    : m % 60
      ? `${Math.floor(m / 60)}h ${m % 60}m`
      : `${Math.floor(m / 60)}h`;
};

const EYEBROWS = ["THAT'S DECIDED", "DINNER, SORTED", "THE VERDICT"];
const CLOSERS = [
  (n) => `${n} it is.`,
  (n) => `Right then — ${n}.`,
  (n) => `${n}. Sorted.`,
  (n) => `Tonight, it's ${n}.`,
];
const EXHALES = [
  "Put the phone down. You've got cooking to do.",
  "That's the hard part over. The rest is just cooking.",
  "No more spinning. Go make it.",
  "Decision made. Off you go.",
];

export default function DoneScreen({ navigation, route }) {
  const recipe = route.params?.recipe;
  const insets = useSafeAreaInsets();

  const [eyebrow] = useState(() => pick(EYEBROWS));
  const [closer] = useState(() => pick(CLOSERS)(recipe?.name ?? "dinner"));
  const [exhale] = useState(() => pick(EXHALES));

  const timeStr = fmtTime(recipe);
  const yieldStr = recipe?.recipeYield || null;

  // Reaching Done is the commitment signal — this dish becomes today's
  // reading, overriding whatever the universe first served.
  useEffect(() => {
    if (recipe?.id) setTodaysReading(recipe, { committed: true });
  }, []);

  const handleSave = () => {
    if (!recipe) return;
    const url = `https://getsavor.recipes/r/${recipe.id}`;
    Linking.openURL(`savor://create?url=${encodeURIComponent(url)}`).catch(
      () => {
        Linking.openURL(SAVOR_STORE_URL).catch(() => {});
      },
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <PotluckHeader onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 28 + (insets.bottom || 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* The dish */}
        {recipe?.image ? (
          <Image
            source={{ uri: recipe.image }}
            style={styles.dish}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.dish, styles.dishFallback]}>
            <Text style={styles.dishFallbackIcon}>🍽️</Text>
          </View>
        )}

        {/* The close */}
        {/* Sealed — this dish is now today's reading */}
        <View style={styles.lockPill}>
          <Icon source="lock" size={11} color="#fff" />
          <Text style={styles.lockPillText}>{eyebrow}</Text>
        </View>

        <Text style={styles.closer} numberOfLines={3}>
          {closer}
        </Text>

        {timeStr || yieldStr ? (
          <View style={styles.metaRow}>
            {timeStr ? <Text style={styles.metaText}>⏱ {timeStr}</Text> : null}
            {timeStr && yieldStr ? <View style={styles.metaDot} /> : null}
            {yieldStr ? (
              <Text style={styles.metaText} numberOfLines={1}>
                🍽 {yieldStr}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.exhale}>{exhale}</Text>

        {/* One soft Savor nudge */}
        <View style={styles.savorBlock}>
          <Text style={styles.savorLine}>
            Savor is where recipes like this live — saved, scaled, and yours.
          </Text>
          <TonightButton
            imageIcon={require("../../assets/savor-logo.png")}
            title="Save this to Savor"
            subtitle="Keep it for next time"
            onPress={handleSave}
          />
        </View>

        {/* Quiet escape */}
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          activeOpacity={0.6}
          style={styles.spinAgain}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text style={styles.spinAgainLabel}>↩ Back to the wheel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  dish: {
    width: 132,
    height: 132,
    borderRadius: 66,
    marginBottom: 24,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: BRAND.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  dishFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "15",
  },
  dishFallbackIcon: { fontSize: 52 },

 lockPill: {
  flexDirection: "row", alignItems: "center", gap: 6,
  backgroundColor: BRAND.teal, borderRadius: 20,
  paddingVertical: 5, paddingHorizontal: 12, marginBottom: 14,
},
lockPillText: { fontFamily: "RalewayBold", fontSize: 10, letterSpacing: 1.6, color: "#fff" },

metaRow:  { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12 },
metaText: { fontFamily: "RalewaySemiBold", fontSize: 13, color: BRAND.teal, opacity: 0.6 },
metaDot:  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: BRAND.teal, opacity: 0.35, marginHorizontal: 10 },
  closer: {
    fontFamily: "RalewayBold",
    fontSize: 26,
    lineHeight: 32,
    color: BRAND.teal,
    textAlign: "center",
  },
  exhale: {
    fontFamily: "Raleway",
    fontSize: 15,
    lineHeight: 22,
    color: BRAND.teal,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 300,
  },

  savorBlock: { width: "100%", alignItems: "center", marginTop: 40 },
  savorLine: {
    fontFamily: "Raleway",
    fontSize: 13,
    lineHeight: 19,
    color: BRAND.teal,
    opacity: 0.55,
    textAlign: "center",
    marginBottom: 4,
    maxWidth: 300,
  },

  spinAgain: { marginTop: 16, paddingVertical: 8 },
  spinAgainLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: BRAND.teal,
    opacity: 0.5,
    letterSpacing: 0.2,
  },
});
