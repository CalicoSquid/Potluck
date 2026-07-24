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

import {
  colors,
  tealAlpha,
} from "../constants/colors";

const DISPLAY_MS = 4800;

export default function UniverseToast({
  toast,
  onUndo,
  onDismiss,
  bottomOffset = 16,
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const dismissing = useRef(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(
    (afterDismiss) => {
      if (dismissing.current) return;

      dismissing.current = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        afterDismiss?.();
        onDismiss?.();
      });
    },
    [onDismiss, progress],
  );

  useEffect(() => {
    if (!toast) return undefined;

    dismissing.current = false;
    progress.setValue(0);

    Animated.spring(progress, {
      toValue: 1,
      damping: 17,
      stiffness: 210,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      dismiss();
    }, DISPLAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [toast?.id, dismiss, progress]);

  if (!toast) return null;

  const handleUndo = () => {
    dismiss(onUndo);
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.positioner,
        {
          bottom: bottomOffset,
          opacity: progress,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={styles.receipt}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>86</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.message} numberOfLines={1}>
            {toast.message || "Banished from the wheel."}
          </Text>

          <Text style={styles.detail} numberOfLines={1}>
            Removed from future spins
          </Text>
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
          <Icon
            source="undo-variant"
            size={16}
            color={colors.teal}
          />

          <Text style={styles.undoLabel}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
  },

  receipt: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,

    borderRadius: 20,
    borderWidth: 1,
    borderColor: tealAlpha(0.16),
    backgroundColor: colors.teal,

    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },

  badge: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",

    borderRadius: 15,
    backgroundColor: colors.primary,
  },

  badgeText: {
    fontFamily: "RalewayBold",
    fontSize: 18,
    color: colors.offWhite,
    letterSpacing: -0.5,
  },

  copy: {
    flex: 1,
    minWidth: 0,
  },

  message: {
    fontFamily: "RalewayBold",
    fontSize: 13,
    lineHeight: 17,
    color: colors.offWhite,
  },

  detail: {
    marginTop: 2,
    fontFamily: "Raleway",
    fontSize: 11,
    lineHeight: 15,
    color: colors.offWhite,
    opacity: 0.62,
  },

  undoButton: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,

    borderRadius: 14,
    backgroundColor: colors.offWhite,
  },

  undoPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.97 }],
  },

  undoLabel: {
    fontFamily: "RalewayBold",
    fontSize: 12,
    color: colors.teal,
  },
});