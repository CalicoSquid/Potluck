import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TouchableOpacity,
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
 *
 * Two beats, not one scroll:
 *   1. How it works — spin, lock in, the week's fading log.
 *   2. Where dinner comes from — the Savor relationship.
 *
 * Split so the Savor message gets its own screen instead of being a beat you
 * scroll past (or, with a pinned CTA, never reach). Each screen is sized to show
 * its own button. The download ask itself lives later, on DoneScreen, once the
 * user's had a win — this is awareness, not a gate.
 *
 * The two screens swap instantly rather than crossfading: they have different
 * heights (a scroll vs a short column), so a fade would have to paper over a
 * layout reflow — which reads as a flicker. A clean cut doesn't.
 *
 * Deliberately not backdrop-dismissable and swallows Android back: the only way
 * forward is the CTA, so nobody taps past the framing by accident.
 */
export default function OnboardingSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  // Always open on step 1. (It only shows once, but a clean reset is free.)
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}} // swallow Android back — the sheet is intentional
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.sheet, { paddingBottom: 24 + (insets.bottom || 0) }]}
        >
          <View style={styles.notch} />

          {step === 0 ? (
            // ── Screen 1 — how it works ──────────────────────────────────
            // Scrolls only if a small device can't fit all three beats; the
            // CTA rides at the end. No Savor here, so scrolling to reach it
            // costs nothing.
            <ScrollView
              style={styles.pane}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.paneBody}
            >
              <Text style={styles.eyebrow}>A WORD FROM THE UNIVERSE</Text>
              <Text style={styles.title}>You spin. It decides. You cook.</Text>
              <Text style={styles.intro}>
                That's the entire app. No feed, no algorithm, nothing to agonise
                over. Fate's got dinner covered.
              </Text>

              <View style={styles.beats}>
                <Beat icon="dice-multiple" title="Give it a spin">
                  Tap the wheel — or the button — and a dish appears. Not
                  feeling it? Spin again. Never want to see it again? Hit 86 to
                  remove it from the pool. The universe is patient. Mostly.
                </Beat>

                <Beat icon="lock-outline" title="Lock in what you'll cook">
                  Nothing sticks until you lock one in. That's your pick for the
                  day, and the one that lands in your week.
                </Beat>

                <Beat glyph title="The three dots, up top">
                  Your week's locked-in dishes live there, then fade after seven
                  days. Permanence is Savor's job.
                </Beat>
              </View>

              <PotluckButton
                icon="arrow-right"
                title="One more thing…"
                subtitle="Where dinner actually comes from"
                onPress={() => setStep(1)}
              />
            </ScrollView>
          ) : (
            // ── Screen 2 — where dinner comes from (the Savor beat) ──────
            <View style={[styles.pane, styles.savorPane]}>
              <View style={styles.savorMark}>
                <Image
                  source={require("../../assets/savor-logo.png")}
                  style={styles.savorLogo}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.eyebrowCenter}>POWERED BY SAVOR</Text>
              <Text style={styles.savorTitle}>Every dish is from Savor.</Text>
              <Text style={styles.savorBody}>
                Potluck is a small thing made by the people behind{" "}
                <Text style={styles.savorStrong}>Savor</Text> — a proper recipe
                app for people who'd rather cook than scroll. Find a keeper
                tonight? Send it to Savor and it's yours for good.
              </Text>

              <PotluckButton
                icon="dice-multiple"
                title="Let fate decide"
                subtitle="Spin your first dinner"
                onPress={onClose}
              />

              <TouchableOpacity
                onPress={() => setStep(0)}
                style={styles.backLink}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
              >
                <Text style={styles.backLinkText}>‹ Back to how it works</Text>
              </TouchableOpacity>
            </View>
          )}
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
    marginBottom: 16,
  },

  // flexShrink lets a pane give up height when the sheet hits its 90% cap, so
  // the notch stays put and a tall screen-1 scrolls internally.
  pane: { flexShrink: 1 },
  paneBody: { paddingBottom: 4 },

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
    marginBottom: 6,
  },
  intro: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 21,
    color: colors.teal,
    opacity: 0.7,
    marginBottom: 18,
  },

  beats: { gap: 15, marginBottom: 18 },
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

  // ── Screen 2 — Savor ────────────────────────────────────────────────
  savorPane: { alignItems: "center", paddingTop: 8 },
  savorMark: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  savorLogo: { width: 40, height: 40 },
  eyebrowCenter: {
    fontFamily: "RalewayBold",
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.orange,
    marginBottom: 8,
    textAlign: "center",
  },
  savorTitle: {
    fontFamily: "RalewayBold",
    fontSize: 24,
    lineHeight: 30,
    color: colors.teal,
    textAlign: "center",
    marginBottom: 10,
  },
  savorBody: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 22,
    color: colors.teal,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  savorStrong: { fontFamily: "RalewayBold", opacity: 1 },

  backLink: { marginTop: 14, paddingVertical: 4 },
  backLinkText: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.5,
    letterSpacing: 0.2,
  },
});
