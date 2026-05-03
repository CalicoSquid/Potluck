import { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Text,
} from "react-native";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("screen");

// ── Sizing — matched to Android 12+ icon-mode native splash ──────────────────
//
// Two knobs to dial in alignment on device:
//
//   LOGO_SIZE        — the *settled* JS logo size (after entrance animation)
//   ENTRANCE_SCALE   — the *initial* scale on mount, before settle
//
// LOGO_SIZE × ENTRANCE_SCALE should roughly match the native splash size.
// The settle animation absorbs any mismatch as motion.

const LOGO_SIZE       = SCREEN_WIDTH * 0.48;
const ENTRANCE_SCALE  = 1.18;
const CENTER_OFFSET_Y = -90;   // pulled up from centre to make room for the reel + tagline

// ── Reel sizing ──────────────────────────────────────────────────────────────

const REEL_WIDTH       = 130;
const REEL_HEIGHT      = 110;
const REEL_BOTTOM_GAP  = SCREEN_HEIGHT < 750 ? 180 : 230;

// ── Brand palette ────────────────────────────────────────────────────────────

const BRAND = {
  teal:   "#142829",
  orange: "#FF9800",
  border: "#f0ebe6",
  bg:     "#fffefe",
};

const SPIN_COLOR    = "#FF5722";
const FOR_COLOR     = "#142829";
const SUPPER_COLOR  = "#FF9800";

// ── Slot symbols ─────────────────────────────────────────────────────────────

const SPIN_SYMBOLS = [
  "🍳","🥗","🍝","🍕","🍔","🍜","🥘","🍱","🌮",
  "🥐","🍣","🍲","🥩","🍰","🦞","🌯","🍛","🫕",
];

const SPIN_INTERVAL_START = 55;
const SPIN_INTERVAL_END   = 200;
const SPIN_DURATION       = 1100;   // total cycling time before lock
const REEL_START_DELAY    = 320;    // wait for logo settle before reel kicks in

/**
 * SplashTransition — slot-machine themed splash.
 *
 * The hero moment is a single reel cycling through food emojis, slowing,
 * and locking onto the Savor logo. Teaches the app's core mechanic before
 * the user has tapped anything.
 *
 * Sequence:
 *   t=0     : mount, logo enters, native splash hides via onLayout
 *   t=320   : reel begins cycling
 *   t=1420  : reel locks on savor-logo (scale pop, haptic, glow flash)
 *   t=1620  : "Spin for your Supper" words stagger in below
 *   t=2300  : container fades out
 *   t=2700  : onDone — app mounts
 */
const SplashTransition = ({ onReadyToPaint, onDone }) => {

  // Container fade
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Logo entrance scale
  const logoScale = useRef(new Animated.Value(ENTRANCE_SCALE)).current;

  // Reel container fade-in (reel appears slightly after the logo settles)
  const reelOpacity = useRef(new Animated.Value(0)).current;
  const reelY       = useRef(new Animated.Value(8)).current;

  // Reel lock animation — scale pop on landing
  const lockScale = useRef(new Animated.Value(1)).current;

  // Reel glow flash on landing
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Reel content state — cycling emoji or null for locked
  const [spinSymbol, setSpinSymbol] = useState(SPIN_SYMBOLS[0]);
  const [locked, setLocked] = useState(false);

  // Word fade-up
  const word1Opacity = useRef(new Animated.Value(0)).current;
  const word2Opacity = useRef(new Animated.Value(0)).current;
  const word3Opacity = useRef(new Animated.Value(0)).current;
  const word1Y       = useRef(new Animated.Value(8)).current;
  const word2Y       = useRef(new Animated.Value(8)).current;
  const word3Y       = useRef(new Animated.Value(8)).current;

  const layoutFiredRef = useRef(false);

  const handleLayout = () => {
    if (layoutFiredRef.current) return;
    layoutFiredRef.current = true;
    onReadyToPaint?.();
  };

  // ── Word entrance helper ───────────────────────────────────────────────
  const wordAnim = (opacity, y) =>
    Animated.parallel([
      Animated.timing(opacity, {
        toValue:         1,
        duration:        260,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue:         0,
        duration:        260,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

  // ── Container fade-out ─────────────────────────────────────────────────
  const fadeOut = () => {
    Animated.timing(containerOpacity, {
      toValue:         0,
      duration:        420,
      easing:          Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDone?.());
  };

  // ── Locking sequence ───────────────────────────────────────────────────
  const lockReel = () => {
    setLocked(true);

    // Scale pop — overshoots slightly then settles
    lockScale.setValue(0.84);
    Animated.spring(lockScale, {
      toValue:         1,
      friction:        3.5,
      tension:         340,
      useNativeDriver: true,
    }).start();

    // Glow flash
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    // Words begin coming in 200ms after the lock punch
    setTimeout(() => {
      Animated.stagger(140, [
        wordAnim(word1Opacity, word1Y),
        wordAnim(word2Opacity, word2Y),
        wordAnim(word3Opacity, word3Y),
      ]).start(() => {
        // Hold for a beat after the last word lands, then fade out
        setTimeout(fadeOut, 260);
      });
    }, 200);
  };

  // ── Cycling logic ──────────────────────────────────────────────────────
  useEffect(() => {
    // Logo entrance settle
    Animated.timing(logoScale, {
      toValue:         1,
      duration:        520,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Reel fade-in
    const reelAppearTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(reelOpacity, {
          toValue:         1,
          duration:        260,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(reelY, {
          toValue:         0,
          duration:        300,
          easing:          Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, REEL_START_DELAY - 80);

    // Cycling — recursive setTimeout that decelerates over SPIN_DURATION
    const tickRef = { current: null };
    let tickCount = 0;
    const totalTicks = Math.round(SPIN_DURATION / SPIN_INTERVAL_START);

    const tick = () => {
      tickCount++;

      // Pick next symbol, avoid trivial repeats
      setSpinSymbol(prev => {
        let next;
        do {
          next = SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)];
        } while (next === prev && SPIN_SYMBOLS.length > 1);
        return next;
      });

      // Light haptic every few ticks (not every frame, would be overwhelming)
      if (tickCount % 3 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      // Compute next interval — eases from FAST to SLOW over the duration
      const progress = Math.min(tickCount / totalTicks, 1);
      const interval = SPIN_INTERVAL_START + (SPIN_INTERVAL_END - SPIN_INTERVAL_START) * progress;

      if (progress < 1) {
        tickRef.current = setTimeout(tick, interval);
      } else {
        // Done cycling — lock onto the logo
        lockReel();
      }
    };

    const startCyclingTimer = setTimeout(() => {
      tickRef.current = setTimeout(tick, SPIN_INTERVAL_START);
    }, REEL_START_DELAY);

    return () => {
      clearTimeout(reelAppearTimer);
      clearTimeout(startCyclingTimer);
      clearTimeout(tickRef.current);
    };
  }, []);

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      onLayout={handleLayout}
      pointerEvents="none"
    >
      {/* ── Logo — sized + positioned to match native splash handoff ── */}
      <View style={styles.logoWrap} pointerEvents="none">
        <Animated.Image
          source={require("../../assets/potluck-splash.png")}
          style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>

      {/* ── Slot reel — the centerpiece ── */}
      <Animated.View
        style={[
          styles.reelWrap,
          {
            opacity:   reelOpacity,
            transform: [{ translateY: reelY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.reel,
            locked && styles.reelLocked,
            { transform: [{ scale: locked ? lockScale : 1 }] },
          ]}
        >
          <View style={styles.notch} />
          <View style={styles.reelWindow}>
            {locked ? (
              <Image
                source={require("../../assets/savor-logo.png")}
                style={styles.lockedLogo}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.spinEmoji}>{spinSymbol}</Text>
            )}

            {/* Glow flash on lock */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: BRAND.orange,
                  borderRadius:    13,
                  opacity:         glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
                },
              ]}
            />

            {/* Recessed top/bottom shadows for the slot machine window feel */}
            <View style={styles.innerShadowTop} />
            <View style={styles.innerShadowBottom} />
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Tagline — comes in after the reel locks ── */}
      <View style={styles.tagline}>
        <Animated.Text
          style={[
            styles.wordSpin,
            { opacity: word1Opacity, transform: [{ translateY: word1Y }] },
          ]}
        >
          Spin
        </Animated.Text>
        <Animated.Text
          style={[
            styles.wordFor,
            { opacity: word2Opacity, transform: [{ translateY: word2Y }] },
          ]}
        >
          for your
        </Animated.Text>
        <Animated.Text
          style={[
            styles.wordSupper,
            { opacity: word3Opacity, transform: [{ translateY: word3Y }] },
          ]}
        >
          Supper
        </Animated.Text>
      </View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position:        "absolute",
    top:             0,
    left:            0,
    width:           SCREEN_WIDTH,
    height:          SCREEN_HEIGHT,
    backgroundColor: BRAND.bg,
    zIndex:          9999,
  },

  // ── Logo ──────────────────────────────────────────────────────────────
  logoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     "center",
    justifyContent: "center",
    transform:      [{ translateY: CENTER_OFFSET_Y }],
  },
  logo: {
    width:  LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // ── Reel ──────────────────────────────────────────────────────────────
  reelWrap: {
    position:   "absolute",
    bottom:     REEL_BOTTOM_GAP,
    left:       0,
    right:      0,
    alignItems: "center",
  },
  reel: {
    width:           REEL_WIDTH,
    height:          REEL_HEIGHT,
    borderRadius:    16,
    backgroundColor: "#ffffff",
    borderWidth:     1.5,
    borderColor:     BRAND.border,
    padding:         3,
    position:        "relative",
    // No elevation/shadow — Android's elevation shadow doesn't fade with
    // opacity, leaving a ghosted halo after the splash fades out. The
    // border + warm bg + glow flash are sufficient definition.
  },
  reelLocked: {
    borderColor: BRAND.orange + "90",
    // No elevation/shadow change here — Android's elevation shadow doesn't
    // fade in sync with opacity, leaving a ghosted shadow halo after the
    // card itself fades. The scale pop + glow flash + border colour change
    // are plenty of emphasis on lock.
  },
  notch: {
    position:               "absolute",
    left:                   -5,
    top:                    (REEL_HEIGHT / 2) - 8,
    width:                  5,
    height:                 16,
    backgroundColor:        BRAND.orange,
    borderTopLeftRadius:    3,
    borderBottomLeftRadius: 3,
    zIndex:                 2,
  },
  reelWindow: {
    flex:            1,
    borderRadius:    13,
    overflow:        "hidden",
    backgroundColor: "#ffffff",
    alignItems:      "center",
    justifyContent:  "center",
  },
  spinEmoji: {
    fontSize:   48,
    lineHeight: 56,
  },
  lockedLogo: {
    width:  REEL_HEIGHT * 0.6,
    height: REEL_HEIGHT * 0.6,
  },
  innerShadowTop: {
    position:             "absolute",
    top:                  0,
    left:                 0,
    right:                0,
    height:               8,
    backgroundColor:      "rgba(0,0,0,0.08)",
    borderTopLeftRadius:  13,
    borderTopRightRadius: 13,
    pointerEvents:        "none",
  },
  innerShadowBottom: {
    position:                "absolute",
    bottom:                  0,
    left:                    0,
    right:                   0,
    height:                  6,
    backgroundColor:         "rgba(0,0,0,0.05)",
    borderBottomLeftRadius:  13,
    borderBottomRightRadius: 13,
    pointerEvents:           "none",
  },

  // ── Tagline ───────────────────────────────────────────────────────────
  tagline: {
    position:      "absolute",
    bottom:        REEL_BOTTOM_GAP - 76,
    left:          0,
    right:         0,
    flexDirection: "row",
    alignItems:    "baseline",
    justifyContent:"center",
    gap:           7,
  },
  wordSpin: {
    fontSize:      20,
    fontFamily:    "RalewaySemiBold",
    color:         SPIN_COLOR,
    letterSpacing: 0.4,
  },
  wordFor: {
    fontSize:      15,
    fontFamily:    "Raleway",
    color:         FOR_COLOR,
    opacity:       0.85,
    letterSpacing: 0.3,
  },
  wordSupper: {
    fontSize:      24,
    fontFamily:    "RalewayBold",
    color:         SUPPER_COLOR,
    letterSpacing: 0.4,
  },
});

export default SplashTransition;