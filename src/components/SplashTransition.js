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

// ── Sizing — matched to native splash ────────────────────────────────────────
//
// The native splash uses Android 12+ icon-mode rendering. With imageWidth: 200
// in app.config.js, the native splash logo is exactly 200dp wide and centered
// on screen. The JS splash mounts at the EXACT same size and position, so the
// handoff is invisible — same image, same place.
//
// Then the logo translates upward to make room for the reel below.
//
// All JS-only — tweak in dev, no rebuild needed.

const LOGO_SIZE       = 200;   // matches native splash imageWidth (dp)
const LOGO_REST_Y     = 0;     // start position — dead center, matches native splash
const LOGO_LIFTED_Y   = -120;  // settled position — pulled up to make room for reel + tagline

// ── Reel sizing ──────────────────────────────────────────────────────────────

const REEL_WIDTH       = 130;
const REEL_HEIGHT      = 110;
const REEL_BOTTOM_GAP  = SCREEN_HEIGHT < 750 ? 200 : 260;

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
const LOGO_HOLD           = 600;    // hold logo at center after handoff before lifting
const LOGO_LIFT_DURATION  = 480;    // logo's upward translation duration
const REEL_START_DELAY    = LOGO_HOLD + 200;  // reel kicks in mid-lift

/**
 * SplashTransition — slot-machine themed splash.
 *
 * The handoff trick: the JS logo mounts at the EXACT size and position of
 * the native splash logo (200dp, centered), so when the native splash hides,
 * the user just sees the same logo continuing. Then the JS logo translates
 * upward, the reel slides in below, the slot machine cycles, locks, and
 * the tagline appears.
 *
 * Sequence:
 *   t=0     : mount, logo centered (matches native splash exactly)
 *   t=220   : logo begins lifting upward
 *   t=420   : reel begins fading in + cycling
 *   t=1520  : reel locks on savor-logo (scale pop, haptic, glow flash)
 *   t=1720  : "Spin for your Supper" words stagger in below
 *   t=2400  : container fades out
 *   t=2820  : onDone — app mounts
 */
const SplashTransition = ({ onReadyToPaint, onDone }) => {

  // Container fade
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Logo translation — starts centered, lifts upward
  const logoY = useRef(new Animated.Value(LOGO_REST_Y)).current;

  // Reel fade-in + slide-up
  const reelOpacity = useRef(new Animated.Value(0)).current;
  const reelY       = useRef(new Animated.Value(12)).current;

  // Reel lock — scale pop on landing
  const lockScale = useRef(new Animated.Value(1)).current;

  // Reel glow flash on landing
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Reel content state
  const [spinSymbol, setSpinSymbol] = useState(SPIN_SYMBOLS[0]);
  const [locked, setLocked] = useState(false);

  // Tagline word stagger
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

    lockScale.setValue(0.84);
    Animated.spring(lockScale, {
      toValue:         1,
      friction:        3.5,
      tension:         340,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    setTimeout(() => {
      Animated.stagger(140, [
        wordAnim(word1Opacity, word1Y),
        wordAnim(word2Opacity, word2Y),
        wordAnim(word3Opacity, word3Y),
      ]).start(() => {
        setTimeout(fadeOut, 260);
      });
    }, 200);
  };

  // ── Main animation ────────────────────────────────────────────────────
  useEffect(() => {
    // Logo lift — after a brief hold at the native-splash position
    const liftTimer = setTimeout(() => {
      Animated.timing(logoY, {
        toValue:         LOGO_LIFTED_Y,
        duration:        LOGO_LIFT_DURATION,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, LOGO_HOLD);

    // Reel appears as the logo is lifting
    const reelAppearTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(reelOpacity, {
          toValue:         1,
          duration:        300,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(reelY, {
          toValue:         0,
          duration:        340,
          easing:          Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, REEL_START_DELAY);

    // Cycling — recursive setTimeout that decelerates over SPIN_DURATION
    const tickRef = { current: null };
    let tickCount = 0;
    const totalTicks = Math.round(SPIN_DURATION / SPIN_INTERVAL_START);

    const tick = () => {
      tickCount++;

      setSpinSymbol(prev => {
        let next;
        do {
          next = SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)];
        } while (next === prev && SPIN_SYMBOLS.length > 1);
        return next;
      });

      if (tickCount % 3 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      const progress = Math.min(tickCount / totalTicks, 1);
      const interval = SPIN_INTERVAL_START + (SPIN_INTERVAL_END - SPIN_INTERVAL_START) * progress;

      if (progress < 1) {
        tickRef.current = setTimeout(tick, interval);
      } else {
        lockReel();
      }
    };

    const startCyclingTimer = setTimeout(() => {
      tickRef.current = setTimeout(tick, SPIN_INTERVAL_START);
    }, REEL_START_DELAY + 80);

    return () => {
      clearTimeout(liftTimer);
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
      {/* ── Logo — mounts at native splash position, then lifts ── */}
      <View style={styles.logoWrap} pointerEvents="none">
        <Animated.Image
          source={require("../../assets/potluck-splash.png")}
          style={[styles.logo, { transform: [{ translateY: logoY }] }]}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>

      {/* ── Slot reel ── */}
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

            <View style={styles.innerShadowTop} />
            <View style={styles.innerShadowBottom} />
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Tagline ── */}
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
  },
  reelLocked: {
    borderColor: BRAND.orange + "90",
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
    position:       "absolute",
    bottom:         REEL_BOTTOM_GAP - 76,
    left:           0,
    right:          0,
    flexDirection:  "row",
    alignItems:     "baseline",
    justifyContent: "center",
    gap:            7,
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