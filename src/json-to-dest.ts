import { State } from "./calc-state-ts/state";
import * as DestAST from "./dest-ast";

export default function jsonToDest(stateString: string) {
  const state = JSON.parse(stateString) as State;
  // TODO: use AJV to perform a full check
  if (state.version !== 8) {
    throw "Desmos JSON versions other than 8 are not currently supported";
  }
  const destAST = jsonToDestAST(state);
  return destASTToDest(destAST);
}

function jsonToDestAST(state: State) {
  const lines: DestAST.Line[] = [];
  const flags = [];

  if (state.randomSeed !== undefined) {
    lines.push({
      type: "setting-seed",
      seed: state.randomSeed,
    });
  }

  const graph = state.graph;

  for (let item of [
    ["degreeMode", "degrees", "radians"],
    ["showGrid", "show grid", "hide grid"],
    ["polarMode", "polar grid", "cartesian grid"],
    ["squareAxes", "square axes", "no square axes"],
    ["restrictGridToFirstQuadrant", "first quadrant", "all quadrants"],
  ] as const) {
    let [key, flagIfTrue, flagIfFalse] = item;
    if (graph[key] === true) {
      flags.push(flagIfTrue);
    } else if (graph[key] === false) {
      flags.push(flagIfFalse);
    }
  }

  lines.push({
    type: "setting-viewport",
    x: {
      start: graph.viewport.xmin,
      end: graph.viewport.xmax,
    },
    y: {
      start: graph.viewport.ymin,
      end: graph.viewport.ymax,
    },
  });

  for (let item of [
    [
      "setting-minor-subdivisions",
      [
        ["x", "xAxisMinorSubdivisions"],
        ["y", "yAxisMinorSubdivisions"],
      ],
      (x: any) => x,
    ],
    [
      "setting-axis-steps",
      [
        ["x", "xAxisStep"],
        ["y", "yAxisStep"],
      ],
      (x: any) => x,
    ],
    [
      "setting-axis-arrows",
      [
        ["x", "xAxisArrowMode"],
        ["y", "yAxisArrowMode"],
      ],
      (s: string) => s.toLowerCase(),
    ],
    [
      "setting-axis-labels",
      [
        ["x", "xAxisLabel"],
        ["y", "yAxisLabel"],
      ],
      (x: any) => x,
    ],
    [
      "setting-axes",
      [
        ["x", "showXAxis"],
        ["y", "showYAxis"],
      ],
      (i: boolean) => (i ? "show" : "hide"),
    ],
    [
      "setting-axis-numbers",
      [
        ["x", "xAxisNumbers"],
        ["y", "yAxisNumbers"],
        ["polar", "polarNumbers"],
      ],
      (i: boolean) => (i ? "show" : "hide"),
    ],
  ] as const) {
    let [type, maps, fn] = item;
    const obj: DestAST.SettingLine = {
      type: type,
    };
    let noneApplied = true;
    for (const mapping of maps) {
      const [to, from] = mapping;
      if (graph[from] !== undefined) {
        let next = graph[from];
        (obj as any)[to] = fn(next);
        noneApplied = false;
      }
    }
    if (!noneApplied) {
      lines.push(obj);
    }
  }

  // TODO: state.expressions.list to DestAST

  return {
    lines: lines,
  };
}

function destASTToDest(destAST: DestAST.Program) {
  return destAST.lines.map(lineToDestString).join("\n");
}

function xypToString<T>(
  line: { x?: T; y?: T; polar?: T },
  fn: (u: T) => string = (x) => `${x}`
) {
  let parts = [];
  if (line.x !== undefined) {
    parts.push("x " + fn(line.x));
  }
  if (line.y !== undefined) {
    parts.push("y " + fn(line.y));
  }
  if (line.polar !== undefined) {
    parts.push("polar " + fn(line.polar));
  }
  if (parts.length === 0) {
    throw "Programming Error: expected x, y, or polar to be defined";
  }
  return parts.join(", ");
}

function lineToDestString(line: DestAST.Line) {
  switch (line.type) {
    case "setting-seed":
      return `seed: "${line.seed}"`;
    case "setting-flags":
      return `flags: ${line.flags.join(", ")}`;
    case "setting-viewport":
      return (
        "viewport: " +
        xypToString(line, (interval) => `[${interval.start}:${interval.end}]`)
      );
    case "setting-minor-subdivisions":
      return "minor-subdivisions: " + xypToString(line);
    case "setting-axis-steps":
      return "axis steps: " + xypToString(line);
    case "setting-axis-arrows":
      return (
        "axis arrows: " +
        xypToString(
          line,
          (u) =>
            ({
              none: "-",
              positive: "->",
              both: "<->",
            }[u])
        )
      );
    case "setting-axis-labels":
      return "axis labels: " + xypToString(line, (u) => `"${u}"`);
    case "setting-axes":
      return "axes: " + xypToString(line);
    case "setting-axis-numbers":
      return "axis numbers: " + xypToString(line);
    case "item-line":
      // TODO: item-line
      throw "Not yet implemented: item-line";
  }
}
