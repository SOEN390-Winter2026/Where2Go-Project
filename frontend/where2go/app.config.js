module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";

  const hasGoogleMapsKey = Boolean(googleMapsApiKey);

  return {
    ...config,
    android: {
      ...config.android,
      package: config.android?.package || "com.where2go.app",
      ...(hasGoogleMapsKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            },
          }
        : {}),
    },
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier || "com.where2go.app",
    },
    extra: {
      ...config.extra,
      googleMapsApiKey,
    },
  };
};
