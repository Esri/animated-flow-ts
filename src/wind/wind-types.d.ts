export type PixelBlock = {
  width: number;
  height: number;
  pixels: number[][]
};

export type Mesh = {
  vertexData: Float32Array;
  indexData: Uint32Array;
}

export type Vertex = {
  position: [number, number];
  distance: number;
  time: number;
}

export type Field = (x: number, y: number) => [number, number];

export type WindData = {
  data: Float32Array;
  width: number;
  height: number;
  pixelScale: number;
}