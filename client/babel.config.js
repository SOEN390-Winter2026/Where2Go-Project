module.exports = function(api) {
  const isTest = api.env('test');
  api.cache.using(() => isTest);
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [] : [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '../.env',
      }]
    ],
  };
};
