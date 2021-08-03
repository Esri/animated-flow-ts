console.log("Hello! I am an Esri worker!");

declare function define(dependencies: string[], callback: (...dependencies: any[]) => any): void;

define([], () => {
  console.log("MIAO!");
  
  return {
    f: () => {
      console.log("CIAO!");
    }
  };
});