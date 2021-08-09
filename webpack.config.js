const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    "winds": "./src/apps/winds.ts",
    "currents": "./src/apps/currents.ts",
    "vortices": "./src/apps/vortices.ts",
    "flow-worker": "./src/flow/flow-worker.ts"
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist")
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      chunks: ["winds"],
      filename: "winds.html"
    }),
    new HtmlWebpackPlugin({
      inject: false,
      chunks: ["currents"],
      filename: "currents.html"
    }),
    new HtmlWebpackPlugin({
      inject: false,
      chunks: ["vortices"],
      filename: "vortices.html"
    })
  ]
};