/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "FamilyGlanceWidget",
  displayName: "Family Glance",
  colors: {
    $accent: "#1E4A8A",
    $widgetBackground: "#FFFFFF",
  },
  frameworks: ["SwiftUI", "WidgetKit"],
  deploymentTarget: "16.0",
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
