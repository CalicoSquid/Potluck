import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";

import { colors } from "../constants/colors";
import PotluckButton from "./PotluckButton";

// The header signature's three pips, rebuilt small so the "three dots" beat
// points at the actual UI element it's describing.
const SIGNATURE_COLORS = [colors.orange, "#4caf50", "#26a69a"];
const SignatureGlyph = () => (
  <View style={styles.sigGlyph}>
    {SIGNATURE_COLORS.map((c) => (
      <View key={c} style={[styles.sigDot, { backgroundColor: c }]} />
    ))}
  </View>
);

// One "how it works" beat: an icon chip on the left, copy on the right.
const Beat = ({ icon, glyph, image, title, children }) => (
  <View style={styles.beat}>
    <View style={styles.beatIcon}>
      {glyph ? (
        <SignatureGlyph />
      ) : image ? (
        <Image source={image} style={styles.beatImage} resizeMode="contain" />
      ) : (
        <Icon source={icon} size={20} color={colors.primary} />
      )}
    </View>
    <View style={styles.beatText}>
      <Text style={styles.beatTitle}>{title}</Text>
      <Text style={styles.beatBody}>{children}</Text>
    </View>
  </View>
);

/**
 * OnboardingSheet — the universe introducing itself, once, on first open.
 * Deliberately not backdrop-dismissable: the one CTA is the only way out, so
 * nobody taps past the framing by accident. Sits over the painted wheel.
 */
export default function OnboardingSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}} // swallow Android back — the sheet is intentional
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 24 + (insets.bottom || 0) }]}>
          <View style={styles.notch} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollBody}
          >
            <Text style={styles.eyebrow}>A WORD FROM THE UNIVERSE</Text>
            <Text style={styles.title}>You spin. It decides. You cook.</Text>
            <Text style={styles.intro}>
              That's the entire app. No feed, no algorithm, nothing to agonise
              over. Fate's got dinner covered.
            </Text>

            <View style={styles.beats}>
              <Beat icon="dice-multiple" title="Give it a spin">
                Tap the wheel — or the button — and a dish appears. Not feeling
                it? Spin again. The universe is endlessly patient. Mostly.
              </Beat>

              <Beat icon="lock-outline" title="Lock in what you'll cook">
                Spin as much as you like — nothing sticks until you lock one
                in. That's your pick for the day, and the one that lands in
                your week.
              </Beat>

              <Beat glyph title="The three dots, up top">
                Your week's locked-in dishes live there, then fade after seven
                days. Nothing here is forever — permanence is Savor's job.
              </Beat>

              <Beat
                image={require("../../assets/savor-logo.png")}
                title="Powered by Savor"
              >
                Every dish comes from the Savor community. Found a keeper? Send
                it to Savor and it's yours for good.
              </Beat>
            </View>

            <PotluckButton
              icon="dice-multiple"
              title="Let the universe decide"
              subtitle="Spin your first dinner"
              onPress={onClose}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,40,41,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 18,
    maxHeight: "90%",
  },
  notch: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.orange + "60",
    marginBottom: 18,
  },
  scrollBody: { paddingBottom: 4 },

  eyebrow: {
    fontFamily: "RalewayBold",
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.orange,
    marginBottom: 8,
  },
  title: {
    fontFamily: "RalewayBold",
    fontSize: 24,
    lineHeight: 30,
    color: colors.teal,
    marginBottom: 8,
  },
  intro: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 21,
    color: colors.teal,
    opacity: 0.7,
    marginBottom: 22,
  },

  beats: { gap: 18, marginBottom: 26 },
  beat: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  beatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  beatImage: { width: 22, height: 22 },
  beatText: { flex: 1, paddingTop: 1 },
  beatTitle: {
    fontFamily: "RalewayBold",
    fontSize: 15,
    color: colors.teal,
    marginBottom: 3,
  },
  beatBody: {
    fontFamily: "Raleway",
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.teal,
    opacity: 0.68,
  },

  // Header-signature echo for the "three dots" beat.
  sigGlyph: { flexDirection: "row", alignItems: "center", gap: 3.5 },
  sigDot: { width: 6, height: 6, borderRadius: 3 },
});