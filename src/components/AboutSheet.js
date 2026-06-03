import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
} from "react-native";
import Constants from "expo-constants";
import TonightButton from "./TonightButton";

const SAVOR_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes";
const PRIVACY_URL = "https://getsavor.recipes/privacy";
const COFFEE_URL  = "https://buymeacoffee.com/calicosquid";

const AboutSheet = ({ visible, onClose }) => {
  const version = Constants.expoConfig?.version || "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.notch} />

          <Text style={styles.title}>What is this?</Text>

          <Text style={styles.body}>
            You spin, the universe picks, you cook. No feed, no algorithm, nothing
            to agonise over. That's the whole app.
          </Text>
          <Text style={styles.body}>
            Potluck is a small thing made by the people behind{" "}
            <Text style={styles.bodyStrong}>Savor</Text> — a proper recipe app for
            people who'd rather cook than scroll. Every recipe here comes from the
            Savor community.
          </Text>

          <TonightButton
            imageIcon={require("../../assets/savor-logo.png")}
            title="Get Savor — it's free"
            subtitle="Your own recipe box. No subscription to start."
            onPress={() => Linking.openURL(SAVOR_STORE_URL).catch(() => {})}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,40,41,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 40,
  },
  notch: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#FF980060", marginBottom: 14 },
  title: { fontFamily: "RalewayBold", fontSize: 22, color: "#142829", marginBottom: 10 },
  body: { fontFamily: "Raleway", fontSize: 14, lineHeight: 21, color: "#142829", opacity: 0.7, marginBottom: 12 },
  bodyStrong: { fontFamily: "RalewayBold" },
  links: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 6 },
  link: { fontFamily: "RalewaySemiBold", fontSize: 13, color: "#142829", opacity: 0.55 },
  linkDivider: { width: 1, height: 12, backgroundColor: "#142829", opacity: 0.2 },
  credit: { fontFamily: "Raleway", fontSize: 11, color: "#142829", opacity: 0.4, textAlign: "center", marginTop: 14, letterSpacing: 0.3 },
});

export default AboutSheet;