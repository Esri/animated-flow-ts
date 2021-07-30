const path = require("path");

module.exports = {
  mode: "development",
  entry: {
    main: "./src/main.ts",
    worker: "./src/worker.ts"
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