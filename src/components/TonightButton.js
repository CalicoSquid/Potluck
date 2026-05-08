import React from "react";
import { TouchableOpacity, StyleSheet, View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "react-native-paper";
import { colors as C } from "../constants/colors";

const DOT_COLS    = 8;
const DOT_ROWS    = 8;
const DOT_SPACING = 10;
const DOT_SIZE    = 3.5;

function HalftoneDots() {
  const dots = [];
  for (let r = 0; r < DOT_ROWS; r++) {
    for (let c = 0; c < DOT_COLS; c++) {
      // Fade: full opacity at right edge (c=0), fading left
      const fade    = (c === 0 ? 1 : 1 - c / (DOT_COLS - 1)) * 0.85 + 0.15;
      const opacity = 0.2 * fade;
      const size    = DOT_SIZE * (0.6 + 0.4 * fade);
      dots.push({ r, c, opacity, size });
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map(({ r, c, opacity, size }) => (
        <View
          key={`${r}-${c}`}
          style={{
            position:        "absolute",
            right:           8 + c * DOT_SPACING,
            top:             8 + r * DOT_SPACING,
            width:           size,
            height:          size,
            borderRadius:    size / 2,
            backgroundColor: "#fff",
            opacity,
          }}
        />
      ))}
    </View>
  );
}

const TonightButton = ({
  onPress,
  title,
  subtitle,
  icon,
  imageIcon,
  gradientColors = [C.gradientStart, C.gradientEnd],
  shadowColor    = C.gradientStart,
  loading        = false,
  disabled       = false,
}) => (
  <TouchableOpacity
    onPress={loading || disabled ? null : onPress}
    activeOpacity={loading || disabled ? 1 : 0.78}
    style={[styles.wrap, { shadowColor }]}
  >
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <HalftoneDots />

      <View style={styles.iconBadge}>
        {imageIcon ? (
          <Image source={imageIcon} style={styles.imageIcon} resizeMode="contain" />
        ) : (
          <Icon source={icon} size={24} color="#fff" />
        )}
      </View>

      <View style={styles.textGroup}>
        <Text style={styles.title}>{loading ? "Please wait…" : title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Icon source="chevron-right" size={20} color="rgba(255,255,255,0.55)" />
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    width:          "100%",
    marginVertical: 8,
    borderRadius:   20,
    shadowOffset:   { width: 0, height: 5 },
    shadowOpacity:  0.28,
    shadowRadius:   10,
    elevation:      6,
  },
  gradient: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   16,
    paddingHorizontal: 18,
    gap:               14,
    borderRadius:      20,
    overflow:          "hidden",
  },
  iconBadge: {
    width:           46,
    height:          46,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  imageIcon: {
    width:  28,
    height: 28,
  },
  textGroup: { flex: 1 },
  title: {
    fontFamily: "RalewayBold",
    fontSize:   18,
    lineHeight: 20,
    color:      "#fff",
  },
  subtitle: {
    fontFamily: "Raleway",
    fontSize:   13,
    marginTop:  3,
    color:      "rgba(255,255,255,0.75)",
  },
});

export default TonightButton;