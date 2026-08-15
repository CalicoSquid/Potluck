const { withAndroidManifest } = require("expo/config-plugins");

const SCHEMES = ["savor", "savor-dev"];

const queryForScheme = (scheme) => ({
  action: [
    {
      $: {
        "android:name": "android.intent.action.VIEW",
      },
    },
  ],
  data: [
    {
      $: {
        "android:scheme": scheme,
      },
    },
  ],
});

const hasScheme = (queries, scheme) =>
  (queries.intent || []).some((intent) =>
    (intent.data || []).some(
      (data) => data?.$?.["android:scheme"] === scheme,
    ),
  );

const withSavorQueries = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // AndroidManifest.xml permits a single <queries> block. Expo's XML parser
    // represents it as an array containing one object; preserve anything other
    // plugins already put there and add only the two Savor URL schemes.
    if (!manifest.queries?.length) manifest.queries = [{}];
    const queries = manifest.queries[0];
    if (!queries.intent) queries.intent = [];

    for (const scheme of SCHEMES) {
      if (!hasScheme(queries, scheme)) {
        queries.intent.push(queryForScheme(scheme));
      }
    }

    return config;
  });

module.exports = withSavorQueries;
module.exports.default = withSavorQueries;
