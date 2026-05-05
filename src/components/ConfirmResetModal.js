import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { pick, RESET_HEADLINES, RESET_SUBS, RESET_CONFIRM, RESET_CANCEL } from "../copy/spinCopy";

const BRAND = {
  teal:   "#142829",
  orange: "#FF9800",
};

const ConfirmResetModal = ({ visible, onConfirm, onCancel }) => {
  const [copy] = useState(() => ({
    headline: pick(RESET_HEADLINES),
    sub:      pick(RESET_SUBS),
    confirm:  pick(RESET_CONFIRM),
    cancel:   pick(RESET_CANCEL),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Orange notch at top */}
          <View style={styles.notch} />

          <Text style={styles.headline}>{copy.headline}</Text>
          <Text style={styles.sub}>{copy.sub}</Text>

          {/* Confirm — teal ghost — destructive action, de-emphasised */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onConfirm}
            activeOpacity={0.75}
          >
            <Text style={styles.confirmLabel}>{copy.confirm}</Text>
          </TouchableOpacity>

          {/* Cancel — orange — primary, encourage them to stay */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelLabel}>{copy.cancel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,40,41,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop:        20,
    paddingBottom:     40,
    gap: 14,
  },
  notch: {
    alignSelf:       "center",
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: BRAND.orange + "60",
    marginBottom:    8,
  },
  headline: {
    fontFamily: "RalewayBold",
    fontSize:   22,
    color:      BRAND.teal,
    textAlign:  "center",
    lineHeight: 28,
  },
  sub: {
    fontFamily: "Raleway",
    fontSize:   14,
    color:      BRAND.teal,
    opacity:    0.65,
    textAlign:  "center",
    lineHeight: 21,
    marginBottom: 6,
  },
  cancelBtn: {
    backgroundColor: BRAND.orange,
    borderRadius:    16,
    paddingVertical: 16,
    alignItems:      "center",
  },
  cancelLabel: {
    fontFamily: "RalewayBold",
    fontSize:   16,
    color:      "#ffffff",
  },
  confirmBtn: {
    borderRadius:    16,
    paddingVertical: 14,
    alignItems:      "center",
    borderWidth:     1.5,
    borderColor:     BRAND.teal + "30",
  },
  confirmLabel: {
    fontFamily: "RalewayBold",
    fontSize:   15,
    color:      BRAND.teal,
    opacity:    0.6,
  },
});

export default ConfirmResetModal;