import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  BackHandler,
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
 * Two screens, not one scroll:
 *   1. How it works — spin, lock in, the week's fading log, and a muttered
 *      warning about 86 that deliberately explains nothing.
 *   2. Where dinner comes from — the Savor relationship.
 *
 * Split so the Savor message gets its own screen instead of being a beat you
 * scroll past (or, with a pinned CTA, never reach). The download ask itself
 * lives later, on DoneScreen, once the user's had a win — this is awareness,
 * not a gate.
 *
 * Full-bleed rather than a bottom sheet. As a sheet, its height was driven by
 * its content, so whatever showed above it was leftover rather than chosen — a
 * ~25pt band of half-cropped ComicBackground that read as a rendering fault, not
 * a glimpse of the app. A sheet only earns its keep when what's behind it means
 * something. Going full-bleed also drops the 90% height cap, which is what made
 * "everything visible without scrolling" a matter of luck on small devices.
 *
 * Layout on both screens: content top, CTA pinned bottom, all the slack pooled
 * into one gap between them. Two evenly-distributed gaps look accidental; one
 * deliberate one doesn't. The CTA lands in the same place on both screens, so it
 * doesn't jump when you advance.
 *
 * Each screen is still a ScrollView with flexGrow — on a phone small enough that
 * the copy genuinely won't fit, it scrolls rather than clipping. It shouldn't
 * ever need to.
 *
 * The two screens swap instantly rather than crossfading: they have different
 * shapes, so a fade would have to paper over a layout reflow — which reads as a
 * flicker. A clean cut doesn't.
 *
 * Deliberately not dismissable and swallows Android back: the only way forward
 * is the CTA, so nobody taps past the framing by accident.
 *
 * An absolutely-positioned overlay inside SpinScreen's root, NOT a <Modal>. A
 * Modal is a separate native window, and on a device whose display config the
 * app overrides (see withLockedDisplayConfig) that window can be sized against
 * a different configuration than the activity — laying the content out wider
 * and taller than the screen it's drawn on, so the right edge of every line and
 * the whole closing block fall outside the visible area with no way to scroll
 * to them. An overlay shares the activity's window and cannot desync from it.
 */
export default function OnboardingSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  // Always open on step 1. (It only shows once, but a clean reset is free.)
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  const paneStyle = {
    paddingTop: (insets.top || 0) + 26,
    paddingBottom: (insets.bottom || 0) + 18,
  };

  // Swallow Android back while the intro is up — the contract Modal's
  // onRequestClose used to hold.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.screen}>
      {step === 0 ? (
        // ── Screen 1 — how it works ──────────────────────────────────
        <ScrollView
          style={styles.pane}
          contentContainerStyle={[styles.paneContent, paneStyle]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View>
            <Text style={styles.eyebrow}>A WORD FROM THE UNIVERSE</Text>
            <Text style={styles.title}>You spin. It decides. You cook.</Text>
            <Text style={styles.intro}>
              That&apos;s the entire app. No feed, no algorithm, nothing to
              agonise over.
            </Text>

            <View style={styles.beats}>
              <Beat icon="dice-multiple" title="Give it a spin">
                Tap the wheel — or the button — and a dish appears. Not
                feeling it? Spin again. The universe is patient. Mostly.
              </Beat>

              <Beat icon="lock-outline" title="Lock in what you'll cook">
                Spin as much as you like. Nothing counts until you lock one in —
                that&apos;s dinner settled, and the universe off your back.
              </Beat>

              <Beat glyph title="The three dots, up top">
                Your week&apos;s locked-in dishes live there, then fade after
                seven days.
              </Beat>
            </View>
          </View>

          <View style={styles.paneFoot}>
            <View style={styles.aside}>
              <View style={styles.asidePill}>
                <Text style={styles.asidePillText}>86</Text>
              </View>
              <Text style={styles.asideText}>
                You&apos;ll see this on a dish. Don&apos;t press it. I know you
                will. Please don&apos;t.
              </Text>
            </View>

            <PotluckButton
              icon="arrow-right"
              title="One more thing…"
              subtitle="Where dinner comes from"
              onPress={() => setStep(1)}
            />
          </View>
        </ScrollView>
      ) : (
        // ── Screen 2 — where dinner comes from (the Savor beat) ──────
        <ScrollView
          style={styles.pane}
          contentContainerStyle={[styles.paneContent, paneStyle]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Centred in whatever's left above the CTA — the poster this
              screen always wanted to be. */}
          <View style={styles.savorBlock}>
            <View style={styles.savorCard}>
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
                <Text style={styles.savorStrong}>Savor</Text> — a proper
                recipe app for people who&apos;d rather cook than scroll. Find
                a keeper tonight? Send it to Savor and it&apos;s yours for
                good.
              </Text>
            </View>
          </View>

          <View style={styles.paneFoot}>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // absoluteFill over SpinScreen's root, which spans the full window (the
  // header applies its own top inset, so nothing has offset us yet and
  // insets.top below is still the right number).
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 50,
    elevation: 50,
  },

  pane: { flex: 1 },
  // flexGrow lets the CTA sit on the bottom edge on a normal phone while still
  // allowing a scroll on one too short to hold the copy.
  //
  // The slack between the content and the CTA is distributed HERE, by
  // space-between on the container. It used to be a <View style={{flex:1}}/>
  // spacer child, which silently broke scrolling: `flex: 1` implies
  // `flexBasis: 0` + `flexShrink: 1`, so the spacer absorbed its size from the
  // viewport and pinned the content container to exactly one screen. On any
  // device where the copy didn't fit, the last elements were clipped and the
  // ScrollView believed there was nothing to scroll to. Never put a flex:1
  // child inside a scrollable container — let justifyContent do it.
  paneContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  // Guarantees a real gap when the screen is tight enough that space-between
  // has nothing left to give.
  paneFoot: { marginTop: 26 },

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
    marginBottom: 26,
  },

  // Gaps opened from 15 — the room the full-bleed layout bought is better spent
  // letting the beats breathe than pooled into one enormous void.
  beats: { gap: 20 },
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

  // The universe's muttered PS about 86. Deliberately NOT a beat — a beat would
  // frame it as a feature to go and use, and the whole joke is that it refuses
  // to explain itself. FIRST_BANISH does the actual teaching, at the moment it
  // lands. The pill apes the real 86 control on the spin screen so it reads as
  // that button on sight — the same trick SignatureGlyph plays with the dots.
  //
  // Void colourway, matching the banish card and The Void well: the one dark
  // thing on a white screen, so the register shift does the work the copy
  // refuses to — and when they finally press 86, the dark card that answers
  // them is already familiar.
  aside: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.tealDark,
    borderWidth: 1,
    borderColor: colors.tealLight,
  },
  // Orange on tealDark — the same pairing as the 86 stamp on the reel. Alphas
  // are lifted from the spin screen's values, which were tuned against white
  // and go invisible on a dark ground.
  asidePill: {
    flexShrink: 0,
    paddingHorizontal: 11,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.primary + "66",
    backgroundColor: colors.primary + "1A",
  },
  asidePillText: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.primary,
  },
  asideText: {
    flex: 1,
    fontFamily: "RalewaySemiBold",
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.offWhite,
    opacity: 0.78,
  },

  // Header-signature echo for the "three dots" beat.
  sigGlyph: { flexDirection: "row", alignItems: "center", gap: 3.5 },
  sigDot: { width: 6, height: 6, borderRadius: 3 },

  // ── Screen 2 — Savor ────────────────────────────────────────────────
  // flexGrow WITHOUT flexShrink/flexBasis:0 — grows into genuine leftover space
  // to centre the card, but sizes to its content when there isn't any, so it
  // can't pin the scroll container the way `flex: 1` did.
  savorBlock: {
    flexGrow: 1,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 16,
  },
  // Screen 1's aside and this card are the same shape at opposite temperatures:
  // one is the void, one is Savor. Full-bleed left this content floating in a
  // lot of white — the card gives it an edge to sit against.
  savorCard: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  savorMark: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
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
    paddingHorizontal: 4,
  },
  savorStrong: { fontFamily: "RalewayBold", opacity: 1 },

  backLink: { marginTop: 10, paddingVertical: 4, alignSelf: "center" },
  backLinkText: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.5,
    letterSpacing: 0.2,
  },
});