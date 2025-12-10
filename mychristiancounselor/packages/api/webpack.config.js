const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

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
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMaps: false,
    }),
  ],
};
