import React, { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import he from "he";
import { Icon } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

import PotluckButton from "./PotluckButton";
import { colors, tealAlpha } from "../constants/colors";
import { loadReadings, dayKey } from "../lib/readings";
import {
  clearBannedRecipes,
  getBanned,
  unbanRecipe,
} from "../lib/banStore";
import { openSavorStore } from "../lib/savor";

const PRIVACY_URL = "https://getsavor.recipes/privacy";
const COFFEE_URL = "https://buymeacoffee.com/calicosquid";

const TABS = [
  { key: "week", label: "This Week" },
  { key: "void", label: "The Void" },
  { key: "about", label: "About" },
];

// "Today" / "Yesterday" / weekday name for a reading entry.
const relDay = (entry) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (entry.date === dayKey()) return "Today";
  if (entry.date === dayKey(yesterday)) return "Yesterday";
  return new Date(entry.ts).toLocaleDateString(undefined, { weekday: "long" });
};

const startOfDay = (time) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Calendar-day age, 0 (today) … 6 (final visible day before the prune).
const ageDays = (entry) =>
  Math.max(
    0,
    Math.round((startOfDay(Date.now()) - startOfDay(entry.ts)) / 86400000),
  );

const BLEACH_MAX = 0.6;
const bleachFor = (age) => (Math.min(age, 6) / 6) * BLEACH_MAX;

const banishedWhen = (timestamp) => {
  if (!timestamp) return "Banished before the void kept records";

  const today = startOfDay(Date.now());
  const day = startOfDay(timestamp);
  const age = Math.round((today - day) / 86400000);

  if (age === 0) return "Banished today";
  if (age === 1) return "Banished yesterday";

  return `Banished ${new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
};

const AboutSheet = ({ visible, onClose, onVoidChange, initialTab }) => {
  const version = Constants.expoConfig?.version || "";
  const navigation = useNavigation();

  const [readings, setReadings] = useState([]);
  const [voidEntries, setVoidEntries] = useState([]);
  const [tab, setTab] = useState("about");
  const [voidBusy, setVoidBusy] = useState(false);
  const [voidFeedback, setVoidFeedback] = useState("");
  const [confirmEmptyVoid, setConfirmEmptyVoid] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    let cancelled = false;
    setVoidFeedback("");
    setConfirmEmptyVoid(false);

    Promise.all([loadReadings(), getBanned()])
      .then(([readingList, bannedList]) => {
        if (cancelled) return;
        setReadings(readingList);
        setVoidEntries(bannedList);
        // An explicit intent from the caller wins — the header passes
        // initialTab="void" when its dots were wearing the void colourway, so
        // the tap lands where it looked like it would. Falls back to the
        // normal precedence, and still degrades gracefully if the void turns
        // out to be empty by the time the sheet opens.
        setTab(
          initialTab === "void" && bannedList.length
            ? "void"
            : initialTab === "week" && readingList.length
              ? "week"
              : readingList.length
                ? "week"
                : bannedList.length
                  ? "void"
                  : "about",
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [visible, initialTab]);

  const hasReadings = readings.length > 0;
  const openReading = (recipe) => {
    onClose();
    navigation.push("Recipe", { recipe, mode: "history" });
  };

  const publishVoid = (nextEntries) => {
    setVoidEntries(nextEntries);
    onVoidChange?.(nextEntries.map((entry) => entry.id));
  };

  const restoreOne = async (entry) => {
    if (!entry?.id || voidBusy) return;

    setVoidBusy(true);
    try {
      await unbanRecipe(entry.id);
      const next = voidEntries.filter((item) => item.id !== entry.id);
      publishVoid(next);
      setVoidFeedback("Back in circulation.");
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch {
      setVoidFeedback("The void held on. Try again.");
    } finally {
      setVoidBusy(false);
    }
  };

  // Intentionally no Alert.alert: confirmation is rendered by the custom
  // Potluck overlay at the bottom of this component.
  const releaseEverything = () => {
    if (!voidEntries.length || voidBusy) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setConfirmEmptyVoid(true);
  };

  const emptyTheVoid = async () => {
    if (!voidEntries.length || voidBusy) return;

    setVoidBusy(true);
    try {
      await clearBannedRecipes();
      publishVoid([]);
      setVoidFeedback("The void has been emptied.");
      setConfirmEmptyVoid(false);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch {
      setConfirmEmptyVoid(false);
      setVoidFeedback("The void resisted. Try again.");
    } finally {
      setVoidBusy(false);
    }
  };

  const closeSheet = () => {
    if (confirmEmptyVoid) {
      setConfirmEmptyVoid(false);
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={closeSheet}
          android_disableSound
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />

        <View style={styles.sheet}>
          {/* No handle and no close button. The notch implied a drag the sheet
              couldn't honour, and an X was furniture on something that already
              dismisses via the backdrop and the system back button. When
              Reanimated lands in a native build the handle comes back with a
              real gesture behind it. */}
          <View style={styles.tabs}>
            {TABS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.tab}
                onPress={() => setTab(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    tab === item.key && styles.tabLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
                {tab === item.key && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {tab === "week" ? (
            hasReadings ? (
              <View>
                <ScrollView
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {readings.map((entry) => {
                    const age = ageDays(entry);
                    const bleach = bleachFor(age);
                    return (
                      <TouchableOpacity
                        key={entry.date}
                        style={styles.readingRow}
                        onPress={() => openReading(entry.recipe)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.thumbWrap}>
                          {entry.recipe?.image ? (
                            <Image
                              source={{ uri: entry.recipe.image }}
                              style={styles.thumb}
                            />
                          ) : (
                            <View style={[styles.thumb, styles.thumbFallback]}>
                              <Text style={styles.fallbackEmoji}>🍽️</Text>
                            </View>
                          )}
                          {bleach > 0 && (
                            <View
                              pointerEvents="none"
                              style={[styles.bleach, { opacity: bleach }]}
                            />
                          )}
                        </View>
                        <View style={styles.readingText}>
                          <Text style={styles.readingName} numberOfLines={1}>
                            {he.decode(entry.recipe?.name || "Untitled recipe")}
                          </Text>
                          <View style={styles.readingMeta}>
                            <Text style={styles.readingDay}>{relDay(entry)}</Text>
                            {age >= 6 && (
                              <Text style={styles.fadingTag}>· fading today</Text>
                            )}
                          </View>
                        </View>
                        <Icon
                          source="chevron-right"
                          size={20}
                          color={colors.teal}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.fade}>
                  Readings fade after a week. Liked one? Save it to Savor before
                  it&apos;s gone.
                </Text>
              </View>
            ) : (
              <View style={styles.emptySection}>
                <Icon
                  source="calendar-blank-outline"
                  size={34}
                  color={colors.teal}
                />
                <Text style={styles.emptyTitle}>No readings yet.</Text>
                <Text style={styles.emptyBody}>
                  Lock in a dish and the universe will remember it here for a
                  week.
                </Text>
              </View>
            )
          ) : tab === "void" ? (
            <View style={styles.voidSection}>
              <View style={styles.voidHeadingRow}>
                <View style={styles.voidHeadingCopy}>
                  <Text style={styles.title}>The Void</Text>
                  <Text style={styles.voidIntro}>
                    Recipes you&apos;ve 86&apos;d live here, beyond the reach of the
                    wheel.
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{voidEntries.length}</Text>
                </View>
              </View>

              {voidEntries.length ? (
                <>
                  <View style={styles.voidWell}>
                  <ScrollView
                    style={styles.voidList}
                    contentContainerStyle={styles.voidListContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    nestedScrollEnabled
                    directionalLockEnabled
                    keyboardShouldPersistTaps="handled"
                    overScrollMode="never"
                    scrollEventThrottle={16}
                  >
                    {voidEntries.map((entry) => {
                      const recipe = entry.recipe;
                      return (
                        <View key={entry.id} style={styles.voidRow}>
                          {recipe?.image ? (
                            <Image
                              source={{ uri: recipe.image }}
                              style={styles.voidThumb}
                            />
                          ) : (
                            <View
                              style={[styles.voidThumb, styles.voidThumbFallback]}
                            >
                              <Text style={styles.voidFallbackEmoji}>86</Text>
                            </View>
                          )}

                          <View style={styles.voidText}>
                            <Text style={styles.voidName} numberOfLines={2}>
                              {he.decode(recipe?.name || "Unknown recipe")}
                            </Text>
                            <Text style={styles.voidDate} numberOfLines={1}>
                              {banishedWhen(entry.banishedAt)}
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => restoreOne(entry)}
                            disabled={voidBusy}
                            android_disableSound
                            style={({ pressed }) => [
                              styles.returnButton,
                              pressed && !voidBusy && styles.buttonPressed,
                              voidBusy && styles.buttonDisabled,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Return ${recipe?.name || "this recipe"} to the wheel`}
                          >
                            <Icon
                              source="undo-variant"
                              size={15}
                              color={colors.offWhite}
                            />
                            <Text style={styles.returnLabel}>Return</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyVoidButton,
                      pressed && !voidBusy && styles.buttonPressed,
                      voidBusy && styles.buttonDisabled,
                    ]}
                    onPress={releaseEverything}
                    disabled={voidBusy}
                    android_disableSound
                    accessibilityRole="button"
                  >
                    <Icon
                      source="delete-sweep-outline"
                      size={18}
                      color={colors.error}
                    />
                    <Text style={styles.emptyVoidLabel}>Empty the void</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.emptySection}>
                  <Icon
                    source="creation-outline"
                    size={36}
                    color={colors.teal}
                  />
                  <Text style={styles.emptyTitle}>Nothing in the void.</Text>
                  <Text style={styles.emptyBody}>
                    The universe is mildly relieved.
                  </Text>
                </View>
              )}

              <Text style={styles.voidFeedback} accessibilityLiveRegion="polite">
                {voidFeedback || " "}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>What is this?</Text>

              <Text style={styles.body}>
                You spin, the universe picks, you cook. No feed, no algorithm,
                nothing to agonise over. That&apos;s the whole app.
              </Text>
              <Text style={styles.body}>
                Potluck is a small thing made by the people behind{" "}
                <Text style={styles.bodyStrong}>Savor</Text> — a proper recipe
                app for people who&apos;d rather cook than scroll. Every recipe
                here comes from the Savor community.
              </Text>

              <PotluckButton
                imageIcon={require("../../assets/savor-logo.png")}
                title="Get Savor — it's free"
                subtitle="Your own recipe box. No subscription to start."
                onPress={openSavorStore}
              />

              <View style={styles.links}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(COFFEE_URL).catch(() => {})}
                  hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.link}>☕ Buy me a coffee</Text>
                </TouchableOpacity>
                <View style={styles.linkDivider} />
                <TouchableOpacity
                  onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
                  hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.link}>Privacy</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.credit}>
                Made by CalicoSquid{version ? ` · v${version}` : ""}
              </Text>
            </>
          )}
        </View>

        {confirmEmptyVoid ? (
          <View style={styles.confirmLayer} accessibilityViewIsModal>
            <Pressable
              style={styles.confirmBackdrop}
              onPress={() => !voidBusy && setConfirmEmptyVoid(false)}
              android_disableSound
              accessibilityRole="button"
              accessibilityLabel="Cancel emptying the void"
            />

            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Icon
                  source="delete-sweep-outline"
                  size={28}
                  color={colors.white}
                />
              </View>

              <Text style={styles.confirmEyebrow}>COSMIC REVERSAL</Text>
              <Text style={styles.confirmTitle}>Empty the void?</Text>
              <Text style={styles.confirmBody}>
                All {voidEntries.length}{" "}
                {voidEntries.length === 1 ? "recipe" : "recipes"} will return to
                the wheel. The universe accepts no responsibility.
              </Text>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[
                    styles.confirmCancel,
                    voidBusy && styles.buttonDisabled,
                  ]}
                  onPress={() => setConfirmEmptyVoid(false)}
                  disabled={voidBusy}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmCancelLabel}>Keep them banished</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmRelease,
                    voidBusy && styles.buttonDisabled,
                  ]}
                  onPress={emptyTheVoid}
                  disabled={voidBusy}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`Empty the void and restore ${voidEntries.length} ${
                    voidEntries.length === 1 ? "recipe" : "recipes"
                  }`}
                >
                  <Icon
                    source="creation-outline"
                    size={17}
                    color={colors.white}
                  />
                  <Text style={styles.confirmReleaseLabel}>
                    {voidBusy ? "Releasing…" : "Empty the void"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,40,41,0.55)",
  },
  sheet: {
    zIndex: 1,
    maxHeight: "84%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    // Was 18 + the notch's 14pt bottom margin; the notch is gone, so the sheet
    // carries the whole gap itself and the tabs sit where they always did.
    paddingTop: 26,
    paddingBottom: 34,
  },

  // ── Tabs ────────────────────────────────────────────────────────────────
  tabs: {
    flexShrink: 0,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabLabel: {
    fontFamily: "RalewaySemiBold",
    fontSize: 14,
    color: colors.teal,
    opacity: 0.4,
  },
  tabLabelActive: { opacity: 1 },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: "22%",
    right: "22%",
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.orange,
  },

  // ── Shared ──────────────────────────────────────────────────────────────
  title: {
    fontFamily: "RalewayBold",
    fontSize: 22,
    color: colors.teal,
    marginBottom: 8,
  },
  fallbackEmoji: { fontFamily: "RalewayBold", fontSize: 17, color: colors.teal },
  voidFallbackEmoji: { fontFamily: "RalewayBold", fontSize: 17, color: colors.offWhite },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.68 },
  emptySection: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    fontFamily: "RalewayBold",
    fontSize: 18,
    color: colors.teal,
  },
  emptyBody: {
    marginTop: 5,
    fontFamily: "Raleway",
    fontSize: 13,
    lineHeight: 19,
    color: colors.teal,
    opacity: 0.55,
    textAlign: "center",
  },

  // ── Readings list ───────────────────────────────────────────────────────
  list: { maxHeight: 320 },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
  },
  thumbWrap: { width: 52, height: 52, borderRadius: 12, overflow: "hidden" },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  bleach: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.offWhite },
  readingText: { flex: 1 },
  readingName: {
    fontFamily: "RalewayBold",
    fontSize: 15,
    color: colors.teal,
    lineHeight: 20,
  },
  readingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  readingDay: {
    fontFamily: "Raleway",
    fontSize: 12,
    color: colors.teal,
    opacity: 0.5,
  },
  fadingTag: {
    fontFamily: "RalewaySemiBold",
    fontSize: 12,
    color: colors.orange,
    opacity: 0.85,
  },
  fade: {
    fontFamily: "Raleway",
    fontSize: 12,
    lineHeight: 18,
    color: colors.teal,
    opacity: 0.5,
    textAlign: "center",
    marginTop: 16,
  },

  // ── The Void ────────────────────────────────────────────────────────────
  voidSection: {},
  voidHeadingRow: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 8,
  },
  voidHeadingCopy: { flex: 1 },
  voidIntro: {
    fontFamily: "Raleway",
    fontSize: 13,
    lineHeight: 19,
    color: colors.teal,
    opacity: 0.58,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: colors.primary,
  },
  countBadgeText: {
    fontFamily: "RalewayBold",
    fontSize: 13,
    color: colors.white,
  },
  voidWell: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.tealDark,
    borderWidth: 1,
    borderColor: colors.tealLight,
  },
  voidList: { maxHeight: 320 },
  voidListContent: { paddingHorizontal: 12, paddingVertical: 2 },
  voidRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  voidThumb: {
    width: 54,
    height: 54,
    flexShrink: 0,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  voidThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  voidText: { flex: 1, minWidth: 0 },
  voidName: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    lineHeight: 18,
    color: colors.offWhite,
  },
  voidDate: {
    marginTop: 2,
    fontFamily: "Raleway",
    fontSize: 10,
    lineHeight: 13,
    color: colors.offWhite,
    opacity: 0.5,
  },
  returnButton: {
    minHeight: 36,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  returnLabel: {
    fontFamily: "RalewayBold",
    fontSize: 11,
    color: colors.offWhite,
  },
  emptyVoidButton: {
    flexShrink: 0,
    minHeight: 42,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.error + "32",
    backgroundColor: colors.error + "0A",
  },
  emptyVoidLabel: {
    fontFamily: "RalewayBold",
    fontSize: 12,
    color: colors.error,
  },
  voidFeedback: {
    flexShrink: 0,
    minHeight: 17,
    marginTop: 7,
    fontFamily: "RalewaySemiBold",
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    textAlign: "center",
  },

  // ── Empty-void confirmation ─────────────────────────────────────────────
  confirmLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 28, 29, 0.72)",
  },
  confirmCard: {
    zIndex: 1,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: tealAlpha(0.12),
    backgroundColor: colors.white,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 16,
  },
  confirmIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderRadius: 19,
    backgroundColor: colors.error,
    transform: [{ rotate: "-3deg" }],
  },
  confirmEyebrow: {
    fontFamily: "RalewayBold",
    fontSize: 10,
    lineHeight: 14,
    color: colors.primary,
    letterSpacing: 1.25,
  },
  confirmTitle: {
    marginTop: 3,
    fontFamily: "RalewayBold",
    fontSize: 23,
    lineHeight: 29,
    color: colors.teal,
    textAlign: "center",
  },
  confirmBody: {
    marginTop: 8,
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 21,
    color: colors.teal,
    opacity: 0.66,
    textAlign: "center",
  },
  confirmActions: {
    width: "100%",
    marginTop: 20,
    gap: 9,
  },
  confirmCancel: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: tealAlpha(0.14),
    backgroundColor: tealAlpha(0.035),
  },
  confirmCancelLabel: {
    fontFamily: "RalewayBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.72,
  },
  confirmRelease: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmReleaseLabel: {
    fontFamily: "RalewayBold",
    fontSize: 14,
    color: colors.white,
  },

  // ── About ───────────────────────────────────────────────────────────────
  body: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 21,
    color: colors.teal,
    opacity: 0.7,
    marginBottom: 12,
  },
  bodyStrong: { fontFamily: "RalewayBold" },
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 6,
  },
  link: {
    fontFamily: "RalewaySemiBold",
    fontSize: 13,
    color: colors.teal,
    opacity: 0.55,
  },
  linkDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.teal,
    opacity: 0.2,
  },
  credit: {
    fontFamily: "Raleway",
    fontSize: 11,
    color: colors.teal,
    opacity: 0.4,
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.3,
  },
});

export default AboutSheet;