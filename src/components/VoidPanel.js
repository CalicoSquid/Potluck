import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "../constants/colors";

// The first-run 86 confirm — shown ONCE, to land the "wait, this is permanent"
// beat and teach what the button does. A dimmed scrim makes it a real moment
// rather than a toast floating over the controls. Every banish after this is
// one tap, and the universe's reaction speaks in the verdict slot, not here.
// Dark on purpose: this is the void the copy keeps threatening.

const IN_MS = 320;
const OUT_MS = 220;

export default function VoidPanel({
  panel,
  onConfirm,
  onCancel,
  onDismiss,
  bottomOffset = 16,
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const activeIdRef = useRef(null);
  const dismissingRef = useRef(null);

  const cbRef = useRef({});
  cbRef.current = { onConfirm, onCancel, onDismiss };

  const hide = useCallback(
    (id) => {
      if (!id || dismissingRef.current === id) return;
      dismissingRef.current = id;
      anim.stopAnimation();
      Animated.timing(anim, {
        toValue: 0,
        duration: OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || activeIdRef.current !== id) return;
        activeIdRef.current = null;
        dismissingRef.current = null;
        cbRef.current.onDismiss?.(id);
      });
    },
    [anim],
  );

  useEffect(() => {
    const id = panel?.id;
    if (!id) return undefined;
    activeIdRef.current = id;
    dismissingRef.current = null;
    anim.stopAnimation();
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel?.id]);

  useEffect(
    () => () => anim.stopAnimation(),
    [anim],
  );

  if (!panel) return null;

  const doConfirm = () => {
    cbRef.current.onConfirm?.(panel.victim, panel.id);
    hide(panel.id);
  };
  const doCancel = () => {
    cbRef.current.onCancel?.(panel.id);
    hide(panel.id);
  };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [44, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.scrim, { opacity: anim }]}
        pointerEvents="auto"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={doCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss without banishing"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.positioner,
          { bottom: bottomOffset, opacity: anim, transform: [{ translateY }] },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={styles.panel}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          <View style={styles.head}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>86</Text>
            </View>
            <Text style={styles.eyebrow}>CAST INTO THE VOID</Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            Banish “{panel.name}”?
          </Text>
          <Text style={styles.sub}>
            It won’t come back to the wheel. You can fish it out of the void
            later — but the universe will remember.
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={doCancel}
              accessibilityRole="button"
              accessibilityLabel="Keep this recipe on the wheel"
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostLabel}>Keep it</Text>
            </Pressable>
            <Pressable
              onPress={doConfirm}
              accessibilityRole="button"
              accessibilityLabel="Banish this recipe to the void"
              style={({ pressed }) => [styles.banishBtn, pressed && styles.pressed]}
            >
              <Text style={styles.banishLabel}>Banish it</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,28,29,0.55)",
  },
  positioner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 100,
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 520,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.tealLight,
    backgroundColor: colors.tealDark,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  stamp: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.primary,
    transform: [{ rotate: "-3deg" }],
  },
  stampText: {
    fontFamily: "RalewayBold",
    fontSize: 16,
    color: colors.white,
    letterSpacing: -0.4,
  },
  eyebrow: {
    fontFamily: "RalewayBold",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1,
    color: colors.orange,
  },
  title: {
    fontFamily: "RalewayBold",
    fontSize: 18,
    lineHeight: 23,
    color: colors.white,
  },
  sub: {
    marginTop: 6,
    fontFamily: "Raleway",
    fontSize: 13,
    lineHeight: 18,
    color: colors.offWhite,
    opacity: 0.72,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  ghostBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  ghostLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.offWhite,
  },
  banishBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  banishLabel: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    color: colors.white,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});