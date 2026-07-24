import React, {
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "react-native-paper";

import { colors, tealAlpha } from "../constants/colors";

const DISPLAY_MS = 5200;
const ENTER_MS = 220;
const EXIT_MS = 160;

/**
 * A compact, branded receipt for an 86 action.
 *
 * Important lifecycle detail: the entrance animation is keyed only to
 * `toast.id`. Parent rerenders during the replacement spin must not restart it.
 * Callback refs keep onUndo/onDismiss fresh without making them animation
 * dependencies.
 */
export default function UniverseToast({
  toast,
  onUndo,
  onDismiss,
  bottomOffset = 16,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(bottomOffset)).current;
  const timerRef = useRef(null);
  const activeToastIdRef = useRef(null);
  const dismissingIdRef = useRef(null);
  const onUndoRef = useRef(onUndo);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // The action area changes height when the replacement spin lands. Glide the
  // receipt above it instead of allowing the receipt to cover the controls.
  useEffect(() => {
    Animated.timing(lift, {
      toValue: bottomOffset,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [bottomOffset, lift]);

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
      progress.stopAnimation();

      Animated.timing(progress, {
        toValue: 0,
        duration: EXIT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || activeToastIdRef.current !== toastId) return;

        activeToastIdRef.current = null;
        dismissingIdRef.current = null;
        onDismissRef.current?.(toastId);
      });
    },
    [clearTimer, progress],
  );

  useEffect(() => {
    const toastId = toast?.id;
    if (!toastId) return undefined;

    activeToastIdRef.current = toastId;
    dismissingIdRef.current = null;
    clearTimer();
    progress.stopAnimation();
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: ENTER_MS,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => dismiss(toastId), DISPLAY_MS);

    return clearTimer;
  }, [toast?.id, clearTimer, dismiss, progress]);

  useEffect(
    () => () => {
      clearTimer();
      progress.stopAnimation();
      lift.stopAnimation();
    },
    [clearTimer, lift, progress],
  );

  if (!toast) return null;

  const handleUndo = () => {
    const toastId = toast.id;
    const victim = toast.victim;

    // Undo immediately so it cancels an in-flight replacement spin without
    // waiting for the receipt's exit animation to finish.
    onUndoRef.current?.(victim, toastId);
    dismiss(toastId);
  };

  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
    extrapolate: "clamp",
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.positioner, { bottom: lift }]}
    >
      <Animated.View
        style={[
          styles.motion,
          { opacity, transform: [{ translateY }, { scale }] },
        ]}
      >
        <View
          style={styles.receipt}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <View style={styles.stamp}>
            <Text style={styles.stampText}>86</Text>
          </View>

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>Banished to the void</Text>
            <Text style={styles.message}>{toast.message}</Text>
          </View>

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
            <Icon source="undo-variant" size={17} color={colors.teal} />
            <Text style={styles.undoLabel}>UNDO</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 100,
    alignItems: "center",
  },

  motion: {
    width: "100%",
    maxWidth: 520,
  },

  receipt: {
    width: "100%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,

    borderRadius: 20,
    borderWidth: 1,
    borderColor: tealAlpha(0.14),
    backgroundColor: colors.white,

    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },

  stamp: {
    width: 46,
    height: 46,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.primary,
    transform: [{ rotate: "-2deg" }],
  },

  stampText: {
    fontFamily: "RalewayBold",
    fontSize: 18,
    color: colors.white,
    letterSpacing: -0.4,
  },

  copy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 1,
  },

  eyebrow: {
    fontFamily: "RalewayBold",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.8,
    color: colors.primary,
    marginBottom: 2,
  },

  message: {
    fontFamily: "RalewaySemiBold",
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.teal,
  },

  undoButton: {
    width: 50,
    minHeight: 48,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 14,
    backgroundColor: tealAlpha(0.07),
  },

  undoPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  undoLabel: {
    fontFamily: "RalewayBold",
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.4,
    color: colors.teal,
  },
});
