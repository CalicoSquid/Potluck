import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "react-native-paper";

import { colors, tealAlpha } from "../constants/colors";

// Long enough to remain visible through the 1.8 second replacement spin, then
// leave the new dish on screen for a beat before its normal verdict returns.
const DISPLAY_MS = 4600;
const ENTER_MS = 160;
const EXIT_MS = 140;

/**
 * An in-place 86 confirmation.
 *
 * This deliberately occupies the same fixed-height slot as the verdict and
 * metadata. It never floats above the action buttons, so changes elsewhere in
 * the screen cannot make it jump. Only opacity animates; its geometry is fixed.
 */
export default function BanNotice({ toast, onUndo, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const activeIdRef = useRef(null);
  const dismissingIdRef = useRef(null);
  const onUndoRef = useRef(onUndo);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(
    (toastId) => {
      if (!toastId || dismissingIdRef.current === toastId) return;

      dismissingIdRef.current = toastId;
      clearTimer();
      opacity.stopAnimation();

      Animated.timing(opacity, {
        toValue: 0,
        duration: EXIT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || activeIdRef.current !== toastId) return;

        activeIdRef.current = null;
        dismissingIdRef.current = null;
        onDismissRef.current?.(toastId);
      });
    },
    [clearTimer, opacity],
  );

  useEffect(() => {
    const toastId = toast?.id;
    if (!toastId) return undefined;

    activeIdRef.current = toastId;
    dismissingIdRef.current = null;
    clearTimer();
    opacity.stopAnimation();
    opacity.setValue(0);

    Animated.timing(opacity, {
      toValue: 1,
      duration: ENTER_MS,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => dismiss(toastId), DISPLAY_MS);

    return clearTimer;
  }, [toast?.id, clearTimer, dismiss, opacity]);

  useEffect(
    () => () => {
      clearTimer();
      opacity.stopAnimation();
    },
    [clearTimer, opacity],
  );

  if (!toast) return null;

  const handleUndo = () => {
    const toastId = toast.id;

    // Restore immediately so an in-flight replacement spin is invalidated now,
    // not after the confirmation has finished fading away.
    onUndoRef.current?.(toast.victim, toastId);
    dismiss(toastId);
  };

  return (
    <Animated.View
      style={[styles.slot, { opacity }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.headerRow}>
        <View style={styles.stamp}>
          <Text style={styles.stampText}>86</Text>
        </View>

        <Text style={styles.eyebrow}>REMOVED FROM THE WHEEL</Text>

        <Pressable
          onPress={handleUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo removing this recipe"
          hitSlop={8}
          style={({ pressed }) => [
            styles.undoButton,
            pressed && styles.undoPressed,
          ]}
        >
          <Icon source="undo-variant" size={15} color={colors.teal} />
          <Text style={styles.undoLabel}>UNDO</Text>
        </Pressable>
      </View>

      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
    height: 112,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tealAlpha(0.12),
    backgroundColor: tealAlpha(0.035),
  },

  headerRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
  },

  stamp: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.primary,
    transform: [{ rotate: "-2deg" }],
  },

  stampText: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    color: colors.white,
    letterSpacing: -0.3,
  },

  eyebrow: {
    flex: 1,
    marginLeft: 9,
    fontFamily: "RalewayBold",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: colors.primary,
  },

  undoButton: {
    minHeight: 30,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: tealAlpha(0.07),
  },

  undoPressed: {
    opacity: 0.65,
  },

  undoLabel: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    color: colors.teal,
    letterSpacing: 0.4,
  },

  message: {
    marginTop: 7,
    paddingHorizontal: 2,
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    lineHeight: 17,
    color: colors.teal,
    textAlign: "center",
  },
});
