const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require('html-webpack-plugin')

const entry = {};
const htmlPages = []; 

const apps = fs.readdirSync(path.resolve(__dirname, "src", "apps"));

for (const appFile of apps) {
  const appName = path.basename(appFile, ".ts");
  const appPath = path.join(__dirname, "src", "apps", appFile);
  entry[appName] = appPath;
  htmlPages.push(new HtmlWebpackPlugin({
    inject: false,
    chunks: [appName],
    filename: `${appName}.html`,
    title: appName
  }));
}

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
    path: path.resolve(__dirname, "dist")
  },
  plugins: [
    ...htmlPages
  ]
};
