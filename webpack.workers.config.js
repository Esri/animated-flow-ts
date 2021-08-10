const path = require("path");
const fs = require("fs");

const entry = {};

const workers = fs.readdirSync(path.resolve(__dirname, "src", "workers"));

for (const workerFile of workers) {
  const workerName = path.basename(workerFile, ".ts");
  const workerPath = path.resolve(__dirname, "src", "workers", workerFile);
  entry[workerName] = workerPath;
}

module.exports = {
  mode: "development",
  devtool: false,
  entry,
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
    path: path.resolve(__dirname, "dist", "workers"),
    libraryTarget: "module"
  },
  experiments: {
    outputModule: true
  }
};
