const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const srcFile = path.resolve(
        config.modRequest.projectRoot,
        "assets",
        "adi-registration.properties"
      );

      const destDir = path.resolve(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );

      const destFile = path.join(destDir, "adi-registration.properties");

      if (!fs.existsSync(srcFile)) {
        console.warn(
          "[withAdiRegistration] adi-registration.properties not found at assets/ — skipping"
        );
        return config;
      }

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcFile, destFile);
      console.log("[withAdiRegistration] Copied adi-registration.properties to native assets");

      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
module.exports.default = withAdiRegistration;