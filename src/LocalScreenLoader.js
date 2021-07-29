import Screen from "./Screen";

export default class LocalScreenLoader {
  load() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const screen = new Screen();
        resolve(screen);
      }, 2000);
    });
  }
}