import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import he from "he";
import { colors } from "../constants/colors";
import TonightButton from "../components/TonightButton";
import TonightCard from "../components/TonightCard";
import PotluckHeader from "../components/PotluckHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Brand palette ────────────────────────────────────────────────────────────
const BRAND = {
  teal:      "#142829",
  tealDark:  "#0d1c1d",
  tealLight: "#1a3536",
  green:     "#4caf50",
  orange:    "#FF9800",
  cream:     "#FFF3EA",
  border:    "#f0ebe6",
};

const SAVOR_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes";

// ── Hero copy pool ────────────────────────────────────────────────────────────

const HERO_TEMPLATES = [
  (name) => `You actually made ${name}.`,
  (name) => `${name}. Decent choice.`,
  (name) => `${name} tonight. Not bad.`,
  (name) => `Nice work — ${name}!`,
  (name) => `${name}, served.`,
];

const HERO_SUBS = [
  "Most people would've scrolled for another hour. Not you, legend.",
  "You let the universe decide. Well done.",
  "Now put down the phone and enjoy your meal.",
  "Three minutes of decision-making, saved.",
  "The universe → your kitchen. Wild.",
  "Beats staring at the fridge.",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Perks list ────────────────────────────────────────────────────────────────

const PERKS = [
  {
    icon:  "food",
    title: "Your own recipe box",
    sub:   "Save unlimited recipes. Tag, search, organise.",
  },
  {
    icon:  "account-multiple",
    title: "Community feed",
    sub:   "Recipes from real cooks. No algorithm.",
  },
  {
    icon:  "magnify",
    title: "Discover recipes",
    sub:   "Browse the web without leaving the app.",
  },
  {
    icon:  "camera-iris",
    title: "Scan from a cookbook",
    sub:   "Snap a page. We turn it into a recipe.",
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DoneScreen({ navigation, route }) {
  const recipe   = route.params?.recipe;
  const insets   = useSafeAreaInsets();
  const spinCount = route.params?.spinCount ?? 3;

  const [heroLine] = useState(() => {
    const template = pick(HERO_TEMPLATES);
    return template(he.decode(recipe?.name ?? "dinner"));
  });
  const [heroSub] = useState(() => pick(HERO_SUBS));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <PotluckHeader onBack={() => navigation.goBack()} spinCount={spinCount} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + (insets.bottom || 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Celebration hero card ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[BRAND.orange + "CC", BRAND.cream, "#ffffff"]}
            style={styles.heroBackdrop}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          <View style={styles.medallion}>
            <View style={styles.medallionInner}>
              <Icon source="party-popper" size={36} color={BRAND.orange} />
            </View>
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.heroEyebrow}>YOU COOKED IT</Text>
            <Text style={styles.heroTitle}>{heroLine}</Text>
            <Text style={styles.heroSub}>{heroSub}</Text>
          </View>
        </View>

        {/* ── Get Savor card with perks ── */}
        <TonightCard style={styles.savorCard}>
          <Text style={styles.savorCardTitle}>Cook like this every night</Text>
          <Text style={styles.savorCardLead}>
            Potluck is just the spin. Savor is the kitchen.
          </Text>

          <View style={styles.perksList}>
            {PERKS.map((p, i) => (
              <View
                key={p.title}
                style={[
                  styles.perkRow,
                  i < PERKS.length - 1 && styles.perkRowBorder,
                ]}
              >
                <View style={styles.perkIconWrap}>
                  <Icon source={p.icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.perkText}>
                  <Text style={styles.perkTitle}>{p.title}</Text>
                  <Text style={styles.perkSub}>{p.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </TonightCard>

        {/* ── Get Savor — primary CTA ── */}
        <TonightButton
          imageIcon={require("../../assets/savor-logo.png")}
          title="Get Savor — it's free"
          subtitle="No subscription needed to get started"
          onPress={() => Linking.openURL(SAVOR_STORE_URL)}
        />

        {/* ── Spin again ── */}
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          activeOpacity={0.6}
          style={styles.spinAgainBtn}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text style={styles.spinAgainLabel}>← Spin again for another</Text>
        </TouchableOpacity>

        {/* ── Footer row ── */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://buymeacoffee.com/calicosquid")}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            style={styles.footerLink}
          >
            <Image
              source={require("../../assets/csc.png")}
              style={styles.cscLogo}
              resizeMode="contain"
            />
            <Text style={styles.footerText}>☕</Text>
          </TouchableOpacity>

          <View style={styles.footerDivider} />

          <TouchableOpacity
            onPress={() => Linking.openURL("https://getsavor.recipes/privacy")}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            style={styles.footerLink}
          >
            <Text style={styles.footerText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.offWhite },
  scroll:        { flex: 1 },
  scrollContent: {
    alignItems:        "center",
    paddingHorizontal: 20,
    paddingTop:        24,
    gap:               20,
  },

  // ── Hero card ──────────────────────────────────────────────────────────
  heroCard: {
    width:           "100%",
    borderRadius:    24,
    overflow:        "hidden",
    backgroundColor: "#fff",
    elevation:       4,
    shadowColor:     BRAND.teal,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.1,
    shadowRadius:    12,
    paddingTop:      130,
    paddingBottom:   28,
    alignItems:      "center",
  },
  heroBackdrop: {
    position: "absolute",
    top:      0,
    left:     0,
    right:    0,
    height:   140,
  },
  medallion: {
    position:       "absolute",
    top:            32,
    left:           "50%",
    marginLeft:     -40,
    width:          80,
    height:         80,
    borderRadius:   40,
    backgroundColor:"#fff",
    alignItems:     "center",
    justifyContent: "center",
    elevation:      6,
    shadowColor:    BRAND.teal,
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.18,
    shadowRadius:   8,
  },
  medallionInner: {
    width:          68,
    height:         68,
    borderRadius:   34,
    backgroundColor:"#fff",
    borderWidth:    2,
    borderColor:    BRAND.orange + "55",
    alignItems:     "center",
    justifyContent: "center",
  },
  heroBody: {
    paddingHorizontal: 24,
    alignItems:        "center",
    gap:               6,
    width:             "100%",
  },
  heroEyebrow: {
    fontFamily:    "RalewayBold",
    fontSize:      11,
    color:         BRAND.orange,
    letterSpacing: 1.6,
    marginBottom:  2,
  },
  heroTitle: {
    fontFamily: "RalewayBold",
    fontSize:   24,
    color:      BRAND.teal,
    lineHeight: 30,
    textAlign:  "center",
  },
  heroSub: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      BRAND.teal,
    opacity:    0.65,
    lineHeight: 21,
    textAlign:  "center",
    marginTop:  4,
  },

  // ── Savor pitch card ───────────────────────────────────────────────────
  savorCard: { width: "100%" },
  savorCardTitle: {
    fontFamily: "RalewayBold",
    fontSize:   18,
    color:      BRAND.teal,
    lineHeight: 24,
  },
  savorCardLead: {
    fontFamily:   "Raleway",
    fontSize:     14,
    color:        BRAND.teal,
    opacity:      0.65,
    lineHeight:   20,
    marginTop:    6,
    marginBottom: 14,
  },
  perksList: { width: "100%" },
  perkRow: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             14,
    paddingVertical: 12,
    width:           "100%",
  },
  perkRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  perkIconWrap: {
    width:          34,
    height:         34,
    borderRadius:   10,
    backgroundColor:colors.primary + "15",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  perkText:  { flex: 1, gap: 2 },
  perkTitle: {
    fontFamily: "RalewayBold",
    fontSize:   14,
    color:      BRAND.teal,
    lineHeight: 18,
  },
  perkSub: {
    fontFamily: "Raleway",
    fontSize:   12,
    color:      BRAND.teal,
    opacity:    0.6,
    lineHeight: 16,
  },

  // ── Spin again ─────────────────────────────────────────────────────────
  spinAgainBtn: {
    alignItems:      "center",
    paddingVertical: 8,
    marginTop:       2,
  },
  spinAgainLabel: {
    fontFamily:    "RalewaySemiBold",
    fontSize:      13,
    color:         BRAND.teal,
    opacity:       0.55,
    letterSpacing: 0.2,
  },

  // ── Footer row ─────────────────────────────────────────────────────────
  footerRow: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             14,
    paddingVertical: 8,
    marginTop:       4,
  },
  footerLink: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
  },
  footerDivider: {
    width:           1,
    height:          12,
    backgroundColor: BRAND.teal,
    opacity:         0.2,
  },
  footerText: {
    fontFamily:    "Raleway",
    fontSize:      11,
    color:         BRAND.teal,
    opacity:       0.4,
    letterSpacing: 0.4,
  },
  cscLogo: {
    width:  20,
    height: 27,
  },
});