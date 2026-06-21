import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { colors } from "../constants/colors";

const { width: W, height: H } = Dimensions.get("window");
const PAD = 12;

function DotGrid({ anchorX, anchorY, cols, rows, spacing, dirX, dirY }) {
  const dots = [];
  const maxDist = Math.sqrt((cols - 1) ** 2 + (rows - 1) ** 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dist  = Math.sqrt(r * r + c * c);
      const fade  = 1 - dist / maxDist;
      const opacity = 0.45 * fade;
      const size    = 5.5 * (0.4 + 0.6 * fade);
      dots.push({
        x: anchorX + dirX * c * spacing,
        y: anchorY + dirY * r * spacing,
        size, opacity,
        key: `${r}-${c}`,
      });
    }
  }
  return dots.map(d => (
    <View
      key={d.key}
      style={{
        position:        "absolute",
        left:            d.x - d.size / 2,
        top:             d.y - d.size / 2,
        width:           d.size,
        height:          d.size,
        borderRadius:    d.size / 2,
        backgroundColor: colors.orange,
        opacity:         d.opacity,
      }}
    />
  ));
}

export default function ComicBackground({ headerHeight }) {
  // Clip everything to below the header — no bleed into the white nav bar
  const top = headerHeight ?? 0;

  return (
    <View
      style={[StyleSheet.absoluteFill, { top }]}
      pointerEvents="none"
    >
      {/* Top-left — largest */}
      <DotGrid anchorX={PAD}     anchorY={PAD}     cols={7} rows={6} spacing={17} dirX={1}  dirY={1}  />
      {/* Top-right — medium */}
      <DotGrid anchorX={W - PAD} anchorY={PAD}     cols={5} rows={5} spacing={16} dirX={-1} dirY={1}  />
      {/* Bottom-left — small */}
      <DotGrid anchorX={PAD}     anchorY={H - top - PAD} cols={5} rows={4} spacing={16} dirX={1}  dirY={-1} />
      {/* Bottom-right — smallest */}
      <DotGrid anchorX={W - PAD} anchorY={H - top - PAD} cols={4} rows={4} spacing={15} dirX={-1} dirY={-1} />
    </View>
  );
}