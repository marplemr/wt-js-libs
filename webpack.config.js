const webpack = require('webpack');

const getDistPath = target => `${__dirname}/dist/${target}`;

const getTargetPlugins = target => target === 'node'
  ? [new webpack.DefinePlugin({ 'global.GENTLY': false })]
  : [];

const createConfig = target => ({
  devtool: 'source-map',
  entry: {
    'wt-js-libs': './libs/index.js'
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /(node_modules)/,
        loader: ['babel-loader']
      }
    ]
  },
  output: {
    path: getDistPath(target),
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },
  target,
  plugins: [
    // new WebpackBundleSizeAnalyzerPlugin('../build-stats.md'),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    }),
    ...getTargetPlugins(target)
  ]
});

const targets = ['web', 'node'];

module.exports = () => targets.map(createConfig);
