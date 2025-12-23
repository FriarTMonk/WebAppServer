const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const webpack = require('webpack');

// Externalize all Node.js built-in modules
const nodeExternals = require('webpack-node-externals');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    libraryTarget: 'commonjs2',
  },
  target: 'node',
  externalsPresets: { node: true },
  externals: [
    nodeExternals({
      allowlist: [/^@mychristiancounselor/]
    }),
    {
      bcrypt: 'commonjs bcrypt',
      '@nestjs/schedule': 'commonjs @nestjs/schedule',
    }
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    fallback: {
      crypto: false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      crypto: 'crypto',
    }),
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets', './src/content'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMaps: false,
    }),
  ],
};
