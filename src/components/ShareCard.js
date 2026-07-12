import React, { forwardRef } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

import { colors } from "../constants/colors";

const CARD_W = 340;
const PHOTO_H = 300;
const WORDMARK_W = 132;
const WORDMARK_H = WORDMARK_W / (1500 / 550);

/**
 * ShareCard — the poster Potluck shares as an image.
 *
 * Rendered off-screen and snapshotted by react-native-view-shot. Deliberately
 * self-contained: the caption, dish, brand-mark and URL are all baked in, so
 * even a pure-image share (Instagram, Stories) travels as a working advert for
 * the whole ecosystem. That's the entire point of Potluck — spread the word.
 *
 * Ref is forwarded to the outer View so the parent can captureRef() it.
 */
const ShareCard = forwardRef(
  ({ recipe, caption, onImageReady, onImageError }, ref) => (
    <View ref={ref} collapsable={false} style={styles.card}>
      {recipe?.image ? (
        <Image
          source={{ uri: recipe.image }}
          style={styles.photo}
          resizeMode="cover"
          onLoad={onImageReady}
          onError={onImageError}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Text style={styles.photoFallbackIcon}>🍽️</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.caption}>
          <Text style={styles.quote}>“</Text>
          {caption}
          <Text style={styles.quote}>”</Text>
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {recipe?.name}
        </Text>
      </View>

      <View style={styles.footer}>
        <Image
          source={require("../../assets/potluck_wordmark.webp")}
          style={styles.wordmark}
          resizeMode="contain"
        />
        <Text style={styles.eyebrow}>SPIN YOUR OWN DINNER</Text>
        <Text style={styles.domain}>getsavor.recipes</Text>
      </View>
    </View>
  ),
);

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
  },
  photo: { width: CARD_W, height: PHOTO_H },
  photoFallback: {
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackIcon: { fontSize: 72 },

  body: { paddingHorizontal: 24, paddingTop: 22, alignItems: "center" },
  caption: {
    fontFamily: "RalewayBold",
    fontSize: 19,
    lineHeight: 26,
    color: colors.teal,
    textAlign: "center",
  },
  quote: { fontFamily: "RalewayBold", fontSize: 24, color: colors.orange },
  name: {
    fontFamily: "Raleway",
    fontSize: 14,
    lineHeight: 20,
    color: colors.teal,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 8,
  },

  footer: {
    marginTop: 22,
    paddingBottom: 22,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: "center",
    gap: 5,
  },
  wordmark: { width: WORDMARK_W, height: WORDMARK_H, marginBottom: 2 },
  eyebrow: {
    fontFamily: "RalewaySemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.orange,
  },
  domain: { fontFamily: "RalewayBold", fontSize: 14, color: colors.teal },
});

export default ShareCard;