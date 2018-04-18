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
  output: {
    path: getDistPath(target),
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },
  target,
  plugins: [
    // https://github.com/sindresorhus/got/issues/345
    new webpack.IgnorePlugin(/^electron$/),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version)
    }),
    ...getTargetPlugins(target)
  ]
});

const targets = ['web', 'node'];

module.exports = () => targets.map(createConfig);
