const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    "real-data": "./src/real-data.ts",
    "fake-data": "./src/fake-data.ts",
    "wind-worker": "./src/wind/wind-worker.ts"
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
  }
};