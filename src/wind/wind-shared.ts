import { Field, Mesh, Vertex, WindData } from "./wind-types";

const MIN_SPEED_THRESHOLD = 0.001;

function createWindFieldFromData(windData: WindData): Field {
  const f = (x: number, y: number): [number, number] => {
    const X = Math.round(x);
    const Y = Math.round(y);
    
    if (X < 0 || X >= windData.width) {
      return [0, 0];
    }
    
    if (Y < 0 || Y >= windData.height) {
      return [0, 0];
    }

    return [windData.data[2 * (Y * windData.height + X) + 0]!, windData.data[2 * (Y * windData.width + X) + 1]!];
  };

  return f;
}

function trace(f: Field, x0: number, y0: number, segmentLength: number): Vertex[] {
  const line: Vertex[] = [];

  let t = 0;
  let d = 0;
  let c = 0;
  
  let x = x0;
  let y = y0;

  line.push({
    position: [x, y],
    distance: d,
    time: t
  });
  
  while (c < 100) {
    const [vx, vy] = f(x, y);
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < MIN_SPEED_THRESHOLD) {
      return line;
    }
    const dx = vx / v;
    const dy = vy / v;
    x += dx * segmentLength;
    y += dy * segmentLength;
    const dt = segmentLength / v;
    t += dt;
    d += segmentLength;
    c++;

    line.push({
      position: [x, y],
      distance: d,
      time: t
    });
  }

  return line;
}

function getFlowLines(f: Field, W: number, H: number, segmentLength: number): Vertex[][] {
  const lines: Vertex[][] = [];

  for (let i = 0; i < 5000; i++) {
    const line = trace(f, Math.round(Math.random() * W), Math.round(Math.random() * H), segmentLength);
    lines.push(line);
  }
  
  return lines;
}

export function createWindMesh(WindData: WindData): Mesh {
  let vertexCount = 0;
  const vertexData: number[] = [];
  const indexData: number[] = [];

  const f = createWindFieldFromData(WindData);
  const flowLines = getFlowLines(f, WindData.width, WindData.height, 3);

  for (const line of flowLines) {
    const random = Math.random();
    const lastVertex = line[line.length - 1]!;
    const totalTime = lastVertex.time;

    for (let i = 1; i < line.length; i++) {
      const { position: [x0, y0], time: t0 } = line[i - 1]!;
      const { position: [x1, y1], time: t1 } = line[i]!;
      const speed = 100 /* TODO! Speed factor! */ / (t1 - t0);

      const l = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
      const ex = -(y1 - y0) / l;
      const ey = (x1 - x0) / l;

      vertexData.push(
        x0, y0, ex, ey, -1, t0, totalTime, speed, random,
        x0, y0, -ex, -ey, +1, t0, totalTime, speed, random,
        x1, y1, ex, ey, -1, t1, totalTime, speed, random,
        x1, y1, -ex, -ey, +1, t1, totalTime, speed, random
      );

      indexData.push(
        vertexCount + 0,
        vertexCount + 1,
        vertexCount + 2,
        vertexCount + 1,
        vertexCount + 3,
        vertexCount + 2
      );

      vertexCount += 4;
    }
  }

  return {
    vertexData: new Float32Array(vertexData),
    indexData: new Uint32Array(indexData)
  };
}