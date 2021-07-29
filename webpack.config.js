const path = require("path");

module.exports = {
  mode: "development",
  entry: {
    main: "./src/main.js",
    worker: "./src/worker.js"
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist")
  }
};