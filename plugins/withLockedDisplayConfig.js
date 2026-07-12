const { withMainActivity } = require("@expo/config-plugins");

// Locks the app's density and font-weight-adjustment to the device's true
// stable values, regardless of the user's system "Display size" and
// "Bold Text" accessibility settings.
//
// Why: those two settings operate below RN's JS layer. "Display size"
// shrinks/grows the effective dp Dimensions.get() reports (breaking any
// fixed-dp layout math), and "Bold Text" forces synthetic bold onto custom
// fonts that don't have a matching bold variant registered, which on
// Android can render as hollow/outline glyphs instead of a solid fill.
// allowFontScaling:false (see src/lib/fontScaling.js) already handles the
// separate "Font size" slider — this plugin covers the other two.

// Injected one-by-one so we can skip any the Expo/RN template already declares.
// The template imports android.os.Build (for invokeDefaultOnBackPressed), and
// injecting a second `import android.os.Build` makes Kotlin flag it as an
// ambiguous import — which fails the build.
const IMPORTS = [
  "import android.content.Context",
  "import android.content.res.Configuration",
  "import android.util.DisplayMetrics",
  "import android.os.Build",
];

const METHOD = `
  override fun attachBaseContext(base: Context) {
    val config = Configuration(base.resources.configuration)
    // Ignore "Display size" (screen zoom) — always use the device's true,
    // stable density so our dp-based layouts render at the sizes we designed.
    config.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
    // Ignore "Bold Text" — always render at the font weight we specify,
    // instead of Android synthesizing bold on top of custom font files.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      config.fontWeightAdjustment = 0
    }
    super.attachBaseContext(base.createConfigurationContext(config))
  }
`;

// True if `contents` already has this exact import line (anchored to line start,
// so "import android.os.Build" won't false-match "…BuildCompat" etc.).
const hasImport = (contents, imp) => {
  const escaped = imp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escaped}\\b`, "m").test(contents);
};

const withLockedDisplayConfig = (config) => {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      console.warn("[withLockedDisplayConfig] MainActivity isn't Kotlin — skipping");
      return config;
    }

    let contents = config.modResults.contents;

    if (contents.includes("DENSITY_DEVICE_STABLE")) {
      return config; // already patched
    }

    // Add only the imports the template doesn't already declare.
    const missing = IMPORTS.filter((imp) => !hasImport(contents, imp));
    if (missing.length) {
      contents = contents.replace(
        /^package [^\n]+\n/,
        (match) => `${match}\n${missing.join("\n")}\n`
      );
    }

    // Insert the override as the first member of the class body.
    contents = contents.replace(
      /class MainActivity : ReactActivity\(\) \{\n/,
      (match) => `${match}${METHOD}\n`
    );

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withLockedDisplayConfig;
module.exports.default = withLockedDisplayConfig;