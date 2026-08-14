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
import { colors } from "../constants/colors";

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

const SPLASH_BG = "#fffefe"; // splash-only near-white, matches native splash bg


// Tagline typed out and styled to match the verdict "voice" (TypewriterVerdict):
// one uniform teal/bold line, framed by orange quote marks, with an orange caret.
const TAGLINE_TEXT = "Spin for your Supper";
const TAGLINE_LEN  = TAGLINE_TEXT.length;

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
const SplashTransition = ({ onReadyToPaint, onDone, fontsReady }) => {
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

  // Tagline typewriter
  const [taglineCount, setTaglineCount] = useState(0);
  const typeRef = useRef(null);

  const layoutFiredRef = useRef(false);

  const handleLayout = () => {
    if (layoutFiredRef.current) return;
    layoutFiredRef.current = true;
    onReadyToPaint?.();
  };

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
      let i = 0;
      typeRef.current = setInterval(() => {
        i += 1;
        setTaglineCount(i);
        if (i >= TAGLINE_LEN) {
          clearInterval(typeRef.current);
          setTimeout(fadeOut, 700);
        }
      }, 45);
    }, 200);
  };

  // ── Main animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!fontsReady) return;

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
      clearInterval(typeRef.current);
    };
  }, [fontsReady]);

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      onLayout={handleLayout}
      pointerEvents="none"
    >
      {/* ── Logo — mounts at native splash position, then lifts ── */}
      <View style={styles.logoWrap} pointerEvents="none">
        <Animated.Image
          source={require("../../assets/potluck-splash.webp")}
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
          <View style={styles.reelWindow}>
            {locked ? (
              <Image
                source={require("../../assets/savor-logo.webp")}
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
                  backgroundColor: colors.orange,
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

      {/* ── Tagline (typed) — styled identically to the verdict "voice" ── */}
      <View style={styles.tagline}>
        <Text style={styles.taglineText} numberOfLines={1}>
          {taglineCount > 0 ? (
            <>
              <Text style={styles.quoteMark}>“</Text>
              {TAGLINE_TEXT.slice(0, taglineCount)}
              {taglineCount < TAGLINE_LEN ? (
                <Text style={styles.caret}>|</Text>
              ) : (
                <Text style={styles.quoteMark}>”</Text>
              )}
            </>
          ) : null}
        </Text>
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
    backgroundColor: SPLASH_BG,
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
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    borderRadius: 18,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    position: "relative",
    // iOS only — Android elevation is deliberately omitted. Elevation on a view
    // inside an opacity-animated parent gets composited offscreen and the
    // shadow renders as an unclipped grey rectangle mid-fade.
    shadowColor: colors.teal,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  reelWindow: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colors.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  reelLocked: {
    borderColor: colors.orange + "90",
  },
  notch: {
    position:               "absolute",
    left:                   -5,
    top:                    (REEL_HEIGHT / 2) - 8,
    width:                  5,
    height:                 16,
    backgroundColor:        colors.orange,
    borderTopLeftRadius:    3,
    borderBottomLeftRadius: 3,
    zIndex:                 2,
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
    position:   "absolute",
    bottom:     REEL_BOTTOM_GAP - 76,
    left:       0,
    right:      0,
    alignItems: "center",
  },
  taglineText: {
    fontFamily:        "RalewayBold",
    fontSize:          19,
    lineHeight:        26,
    color:             colors.teal,
    textAlign:         "center",
    paddingHorizontal: 4,
  },
  quoteMark: {
    fontFamily: "RalewayBold",
    fontSize:   24,
    color:      colors.orange,
  },
  caret: {
    fontFamily: "RalewayBold",
    fontSize:   19,
    color:      colors.orange,
  },
});

export default SplashTransition;