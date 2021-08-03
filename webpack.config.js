const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    main: "./src/main.ts",
    "wind-worker": "./src/wind/wind-worker.ts"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
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