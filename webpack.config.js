const webpack = require('webpack');

const getDistPath = target => `${__dirname}/dist/${target}`;

const getTargetPlugins = (target) => {
  return target === 'node'
  ? [new webpack.DefinePlugin({ 'global.GENTLY': false })]
  : [];
}

const createConfig = (target) => ({
  devtool: 'source-map',
  entry: {
    'wt-js-libs': './src/index.js'
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /(node_modules)/,
        loader: ['babel-loader']
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  optimization: {
    splitChunks: {
      chunks: "all",
      name: true,
    },
  },
  resolve: {
    // On some platforms, scrypt gets built in an unexpected way
    alias: {
      './build/Release/scrypt': './build/Release/scrypt.node',
    }
  },
  externals: {
    // To make got (dependency of web3-bzz happy)
    electron: 'electron',
  },
  output: {
    path: getDistPath(target),
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },
  target,
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    }),
    ...getTargetPlugins(target)
  ]
});

const targets = ['web', 'node'];

module.exports = () => targets.map(createConfig);
