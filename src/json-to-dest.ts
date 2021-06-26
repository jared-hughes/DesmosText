import { truncate } from "fs";
import * as CalcState from "./calc-state-ts/state";
import * as DestAST from "./dest-ast";

const INDENT = "  ";

export default function jsonToDest(stateString: string) {
  const state = JSON.parse(stateString) as CalcState.State;
  // TODO: use AJV to perform a full check
  if (state.version !== 8) {
    throw "Desmos JSON versions other than 8 are not currently supported";
  }
  const destAST = jsonToDestAST(state);
  return destASTToDest(destAST);
}

function jsonToDestAST(state: CalcState.State) {
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

  let currentFolderChildren: DestAST.ItemLine[] | null = null;
  let currentFolderID: string | null = null;
  for (let item of state.expressions.list) {
    let affixGroup: DestAST.AffixGroup;
    let smallFlags: DestAST.SmallFlag[] = [];
    let optionGroups: DestAST.OptionGroup[] = [
      // `id:` ID as a string, such as `id: "7"`
      {
        key: "id",
        value: item.id,
      },
      ...getCommonOptionGroups(item),
    ];
    // for all: `secret`
    item.secret && smallFlags.push("secret");
    // for expressions, images, folders, table columns: `hidden`
    "hidden" in item && item.hidden && smallFlags.push("hidden");
    switch (item.type) {
      case "folder":
        currentFolderChildren = [];
        currentFolderID = item.id;
        affixGroup = {
          key: "folder",
          children: currentFolderChildren,
        };
        if (item.title !== undefined) {
          affixGroup.title = item.title;
        }
        // for folders: `collapsed` (`not collapsed` is default, omitted)
        item.collapsed && smallFlags.push("collapsed");
        break;
      case "table":
        affixGroup = {
          key: "table",
          columns: item.columns.map(transformTableColumn),
        };
        break;
      case "simulation":
        affixGroup = {
          key: "simulation",
          rules: decodeClickableRules(item.clickableInfo?.rules ?? []),
        };
        // for simulations: `playing` (`not playing` is default, omitted)
        item.isPlaying && smallFlags.push("playing");
        // (for simulations) `fps:` fps as a math_expr
        item.fps !== undefined &&
          optionGroups.push({
            key: "fps",
            value: parseLatex(item.fps),
          });
        break;
      case "expression":
        affixGroup = {
          key: "expr",
          expr: parseLatex(item.latex ?? ""),
        };
        optionGroups.push(...getExpressionOptionGroups(item));
        break;
      case "image":
        affixGroup = {
          key: "image",
          imageURL: item.image_url,
        };
        // for images: `foreground` (`background` is default, omitted)
        item.foreground && smallFlags.push("foreground");
        // for images: `draggable` (`not draggable` is default, omitted)
        item.draggable && smallFlags.push("draggable");
        // (for images) `name:` string
        item.name !== undefined &&
          optionGroups.push({
            key: "name",
            value: item.name,
          });
        // `image: width = 10`
        // `image: height = 7`
        // `image: center = (3,3)`
        // `image: angle = 4*pi`
        // `image: opacity = 0.8`
        [item.width, item.height, item.center, item.angle, item.opacity].some(
          (c) => c !== undefined
        ) &&
          optionGroups.push({
            key: "image",
            opts: {
              ...(item.width !== undefined && {
                width: parseLatex(item.width),
              }),
              ...(item.height !== undefined && {
                height: parseLatex(item.height),
              }),
              ...(item.center !== undefined && {
                center: parseLatex(item.center),
              }),
              ...(item.angle !== undefined && {
                angle: parseLatex(item.angle),
              }),
              ...(item.opacity !== undefined && {
                opacity: parseLatex(item.opacity),
              }),
            },
          });
        break;
      case "text":
        affixGroup = {
          key: "note",
        };
        if (item.text !== undefined) {
          affixGroup.text = item.text;
        }
        break;
    }
    let line: DestAST.ItemLine = {
      type: "item-line",
      smallFlags,
      affixGroup,
      optionGroups: [],
    };
    if (item.type === "folder" || item.folderId !== currentFolderID) {
      if (item.id !== currentFolderID) {
        currentFolderChildren = null;
        currentFolderID = null;
      }
      lines.push(line);
    } else {
      currentFolderChildren?.push(line);
    }
  }

  return {
    lines: lines,
  };
}

function decodeClickableRules(rules: CalcState.ClickableInfoRules) {
  return rules.map((rule) => ({
    id: rule.id,
    expression: parseLatex(rule.expression),
    assignment: parseLatex(rule.assignment),
  }));
}

function getExpressionOptionGroups(item: CalcState.ExpressionState) {
  const optionGroups: DestAST.OptionGroup[] = [];
  const vizProps = item.vizProps;
  const slider = item.slider;
  // `clickable label:` description of clickable object, as a string
  if (item.clickableInfo?.description !== undefined) {
    optionGroups.push({
      key: "clickable label",
      value: item.clickableInfo.description,
    });
  }
  // `clickable rules:` list of enabled clickable object rules (requires clickable rules enabled)
  // `disabled clickable rules:` list of clickable object rules (note `disabled` is default, so no mention in the graph state)
  if (item.clickableInfo?.rules !== undefined) {
    optionGroups.push({
      key: "clickable rules",
      value: decodeClickableRules(item.clickableInfo.rules),
      flags: item.clickableInfo?.enabled ? [] : ["disabled"],
    });
  }
  // `regression: log mode`; `regression: no log mode` is default, omitted
  // `regression: {a=0.01, b=47}` regression parameters as key-value pairs.
  // `regression: residuals = e_{1}`
  if (
    item.regressionParameters !== undefined ||
    item.residualVariable !== undefined ||
    item.isLogModeRegression !== undefined
  ) {
    optionGroups.push({
      key: "regression",
      parameters: Object.entries(item.regressionParameters ?? {}).map(
        ([key, value]) => ({
          parameter: parseLatex(key),
          value: value,
        })
      ),
      opts: item.residualVariable
        ? { residualVariable: parseLatex(item.residualVariable) }
        : {},
      flags: item.isLogModeRegression ? ["log mode"] : [],
    });
  }
  // `slider: hard min`; `slider: soft min` is default, omitted
  // `slider: hard max`; `slider: soft max` is default, omitted
  // `slider: loop backward`, `slider: once forward`, `slider: forever forward`; `slider: loop forward` is default
  // `slider: playing` (`slider: not playing` is default, omitted)
  // `slider: left` for playDirection (`slider: right` is default, omitted)
  // `slider: period = 8000` (4000 is 1x, 8000 is 0.5x, etc.)
  // `slider`: slider bounds as an interval, such as `slider: [0:5:1]`
  if (slider) {
    const sliderFlags: (DestAST.OptionGroup & { key: "slider" })["flags"] = [];
    slider.hardMin && sliderFlags.push("hard min");
    slider.hardMax && sliderFlags.push("hard max");
    slider.loopMode !== undefined &&
      slider.loopMode !== "LOOP_FORWARD_REVERSE" &&
      sliderFlags.push(
        (
          {
            LOOP_FORWARD: "loop forward",
            PLAY_ONCE: "once forward",
            PLAY_INDEFINITELY: "forever forward",
          } as const
        )[slider.loopMode]
      );
    slider.playDirection === -1 && sliderFlags.push("left");
    let sliderValue = {
      ...(slider.min !== undefined ? { min: parseLatex(slider.min) } : {}),
      ...(slider.max !== undefined ? { max: parseLatex(slider.max) } : {}),
    };
    optionGroups.push({
      key: "slider",
      ...((slider.min !== undefined || slider.max !== undefined) && {
        value: sliderValue,
      }),
      opts:
        slider.animationPeriod !== undefined
          ? { period: slider.animationPeriod }
          : {},
      flags: sliderFlags,
    });
  }

  // `polar domain`: polar domain as an interval, such as `polar domain: [0:2*pi]`
  if (item.polarDomain !== undefined) {
    optionGroups.push({
      key: "polar domain",
      value: {
        min: parseLatex(item.polarDomain.min),
        max: parseLatex(item.polarDomain.max),
      },
    });
  }
  // `domain`: parametric domain as an interval, such as `domain: [0:1]`
  //  (assumes `domain` and `parametricDomain` are the same always; from testing, `domain` has no effect)
  if (item.domain !== undefined) {
    optionGroups.push({
      key: "domain",
      value: {
        min: parseLatex(item.domain.min),
        max: parseLatex(item.domain.max),
      },
    });
  }
  // `cdf: show`; `cdf: hide` is default, omitted
  // `cdf`: integration bounds as an interval, such as `cdf: [1:8]`
  if (item.cdf !== undefined) {
    let cdfInterval: DestAST.Interval = {};
    if (item.cdf.min !== undefined) {
      cdfInterval.min = parseLatex(item.cdf.min);
    }
    if (item.cdf.max !== undefined) {
      cdfInterval.max = parseLatex(item.cdf.max);
    }
    optionGroups.push({
      key: "cdf",
      ...((item.cdf.min !== undefined || item.cdf.max !== undefined) && {
        value: cdfInterval,
      }),
      flags: item.cdf.show ? ["show"] : [],
    });
  }
  // `label: show`; `label: hide` is default, omitted
  // `label: placement below left`, `label: placement right`, ... (TODO)
  // `label: editable math`, `label: editable text`; no default
  // `label: show on hover` (doesn't show if `show label` is disabled); `label: show always` is default, omitted
  // `label: no outline`; `label: outline` is default, omitted
  // `label`: label string, such as `label: "Origin"`
  // `label: size = 5+u` (besides math expressions, `small`, `medium` and `large` are accepted)
  // `label: angle = pi/2`
  const labelFlags: (DestAST.OptionGroup & { key: "label" })["flags"] = [];
  item.showLabel && labelFlags.push("show");
  // TODO: labelOrientation
  item.editableLabelMode &&
    labelFlags.push(
      item.editableLabelMode === "MATH" ? "editable math" : "editable text"
    );
  item.interactiveLabel && labelFlags.push("show on hover");
  item.suppressTextOutline && labelFlags.push("no outline");
  if (
    labelFlags.length > 0 ||
    "label" in item ||
    "labelAngle" in item ||
    "labelSize" in item
  ) {
    optionGroups.push({
      key: "label",
      ...("label" in item && { value: item.label }),
      opts: {
        ...("labelSize" in item && { size: parseLatex(item.labelSize ?? "") }),
        ...("labelAngle" in item && {
          angle: parseLatex(item.labelAngle ?? ""),
        }),
      },
      flags: labelFlags,
    });
  }
  // `display: fraction`: expression value display mode (`float` is default, omitted)
  if (item.displayEvaluationAsFraction) {
    optionGroups.push({
      key: "display",
      flags: ["fraction"],
    });
  }
  // `bins aligned: left`: for histograms & dotplots (`center` is default, omitted)
  if (vizProps?.binAlignment === "left") {
    optionGroups.push({
      key: "bins aligned",
      flags: ["left"],
    });
  }
  // `histogram mode: relative` and `histogram mode: density` (`count` is default, omitted)
  if (
    vizProps?.histogramMode !== undefined &&
    vizProps?.histogramMode !== "count"
  ) {
    optionGroups.push({
      key: "histogram mode",
      flags: [vizProps.histogramMode],
    });
  }
  // `dotplot: binned x`; `dotplot: exact x` is default, omitted
  if (vizProps?.dotplotXMode === "exact") {
    optionGroups.push({
      key: "dotplot",
      flags: ["binned x"],
    });
  }
  // `boxplot: aligned to y`; `boxplot: aligned to x` is default, omitted
  // `boxplot: include outliers`; `boxplot: exclude outliers` is default, omitted
  // `boxplot: breadth = 5`
  // `boxplot: offset = 3`
  const boxplotFlags: (DestAST.OptionGroup & { key: "boxplot" })["flags"] = [];
  vizProps?.showBoxplotOutliers && boxplotFlags.push("include outliers");
  vizProps?.alignedAxis === "y" && boxplotFlags.push("aligned to y");
  if (
    boxplotFlags.length > 0 ||
    vizProps?.breadth !== undefined ||
    vizProps?.axisOffset !== undefined
  ) {
    optionGroups.push({
      key: "boxplot",
      ...(vizProps?.breadth !== undefined && {
        breadth: parseLatex(vizProps.breadth),
      }),
      ...(vizProps?.axisOffset !== undefined && {
        offset: parseLatex(vizProps.axisOffset),
      }),
      flags: boxplotFlags,
    });
  }
  // return
  return optionGroups;
}

function getCommonOptionGroups(
  item: CalcState.TableColumn | CalcState.ItemState
) {
  const optionGroups: DestAST.OptionGroup[] = [];
  // `points: show`, `points: hide`
  // `points: open`, `points: cross`; `points: dot` is default, omitted
  // `points: opacity = v_{a}`
  // `points: size = 2.5`
  const pointFlags: (DestAST.OptionGroup & { key: "points" })["flags"] = [];
  if ("points" in item) {
    pointFlags.push(item.points ? "show" : "hide");
  }
  if ("pointStyle" in item && item.pointStyle !== "POINT") {
    pointFlags.push(item.pointStyle === "OPEN" ? "open" : "cross");
  }
  if (pointFlags.length > 0 || "pointOpacity" in item || "pointSize" in item) {
    optionGroups.push({
      key: "points",
      flags: pointFlags,
      opts: {
        ...("pointOpacity" in item && {
          opacity: parseLatex(item.pointOpacity ?? ""),
        }),
        ...("pointSize" in item && { size: parseLatex(item.pointSize ?? "") }),
      },
    });
  }
  // `lines: show`, `lines: hide`
  // `lines: dashed`, `lines: dotted`; `lines: solid` is default, omitted
  // `lines: opacity = 0.5k`
  // `lines: width = 5+c`
  const lineFlags: (DestAST.OptionGroup & { key: "lines" })["flags"] = [];
  if ("lines" in item) {
    lineFlags.push(item.lines ? "show" : "hide");
  }
  if ("lineStyle" in item && item.lineStyle !== "SOLID") {
    lineFlags.push(item.lineStyle === "DASHED" ? "dashed" : "dotted");
  }
  if (lineFlags.length > 0 || "lineOpacity" in item || "lineWidth" in item) {
    optionGroups.push({
      key: "lines",
      flags: lineFlags,
      opts: {
        ...("lineOpacity" in item && {
          opacity: parseLatex(item.lineOpacity ?? ""),
        }),
        ...("lineWidth" in item && { size: parseLatex(item.lineWidth ?? "") }),
      },
    });
  }
  // `fill: show`, `fill: hide`
  // `fill: opacity = 0.5k`
  if ("fill" in item || "fillOpacity" in item) {
    optionGroups.push({
      key: "fill",
      flags: "fill" in item ? [item.fill ? "show" : "hide"] : [],
      opts:
        "fillOpacity" in item
          ? { opacity: parseLatex(item.fillOpacity ?? "") }
          : {},
    });
  }
  // `color`: color, such as `color: #000000`
  // `color: var = c_x`;
  optionGroups.push({
    key: "color",
    ...("color" in item && { value: item.color }),
    opts:
      "colorLatex" in item ? { var: parseLatex(item.colorLatex ?? "") } : {},
  });
  // `drag: x`, `drag: y`, `drag: xy`: drag mode (`none` is default, omitted)
  if (
    "dragMode" in item &&
    item.dragMode !== undefined &&
    item.dragMode !== "NONE"
  ) {
    optionGroups.push({
      key: "drag",
      flags: [({ X: "x", Y: "y", XY: "xy" } as const)[item.dragMode]],
    });
  }
  // return
  return optionGroups;
}

function transformTableColumn(item: CalcState.TableColumn) {
  // together
  const out = {
    values: item.values.map(parseLatex),
    ...(item.latex !== undefined ? { header: parseLatex(item.latex) } : {}),
    smallFlags: item.hidden ? ["hidden" as const] : [],
    optionGroups: getCommonOptionGroups(item),
  };
  return out;
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
      return `seed: ${encodeString(line.seed)}`;
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
      return "axis labels: " + xypToString(line, encodeString);
    case "setting-axes":
      return "axes: " + xypToString(line);
    case "setting-axis-numbers":
      return "axis numbers: " + xypToString(line);
    case "item-line":
      return translateItemLine(line, "");
  }
}

function translateItemLine(
  line: DestAST.ItemLine,
  indentation: string
): string {
  const smallFlagsString = line.smallFlags.map((c) => c + " ").join();
  const affixGroupString = translateAffixGroup(line.affixGroup, indentation);
  const affixString = `${smallFlagsString}${affixGroupString}`;
  const optionsString = line.optionGroups
    .map((line) => encodeOptionGroup(line, indentation) + "; ")
    .join();
  switch (line.affixGroup.key) {
    case "folder":
    case "table":
    case "simulation":
      return `${indentation}${optionsString}${
        optionsString !== "" ? " " : ""
      }${affixString}`;
    case "expr":
    case "image":
    case "note":
      return `${indentation}${affixString}${
        affixString !== "" ? " " : ""
      }${optionsString}`;
  }
}

function translateAffixGroup(
  affixGroup: DestAST.AffixGroup,
  indentation: string
) {
  switch (affixGroup.key) {
    case "folder":
      let childrenString =
        "\n" +
        affixGroup.children
          .map((line) => translateItemLine(line, indentation + INDENT))
          .join("\n") +
        "\n";
      if (affixGroup.children.length === 0) {
        childrenString = " ";
      }
      const titleString = affixGroup.title
        ? encodeString(affixGroup.title) + " "
        : "";
      return `folder ${titleString}{${childrenString}}`;
    case "table":
      const tableString =
        "{\n" +
        affixGroup.columns
          .map((col) => encodeColumnLine(col, indentation + INDENT))
          .join("\n") +
        `\n${indentation}}`;
      if (affixGroup.columns.length === 0) {
        return "table { }";
      } else {
        return `table ${tableString}`;
      }
    case "simulation":
      return `simulation ${encodeClickableRules(
        affixGroup.rules,
        indentation
      )}`;
    case "expr":
      return affixGroup.expr !== undefined ? encodeLatex(affixGroup.expr) : "";
    case "image":
      return `image ${encodeString(affixGroup.imageURL)}`;
    case "note":
      return affixGroup.text !== undefined
        ? `note ${encodeString(affixGroup.text)}`
        : "note";
  }
}

function encodeColumnLine(column: DestAST.ColumnLine, indentation: string) {
  const smallFlagsString = column.smallFlags.map((c) => c + " ").join();
  const optionGroupsString = column.optionGroups
    .map((group) => "; " + encodeOptionGroup(group, indentation))
    .join();
  const columnValuesString = encodeLatexList(column.values);
  return (
    indentation + smallFlagsString + columnValuesString + optionGroupsString
  );
}

function encodeClickableRules(
  rules: DestAST.ClickableRule[],
  indentation: string
) {
  let rulesString =
    "\n" +
    rules
      .map((rule) => encodeClickableRule(rule, indentation + INDENT))
      .join("\n") +
    "\n";
  if (rules.length === 0) {
    rulesString = " ";
  }
  return `{${rulesString}}`;
}

function encodeClickableRule(rule: DestAST.ClickableRule, indentation: string) {
  const exprString = encodeLatex(rule.expression);
  let out = `${indentation}${encodeLatex(rule.assignment)} <- ${exprString}`;
  if (rule.id !== undefined) {
    out += `; id: ${encodeString(rule.id)}`;
  }
  return out;
}

function encodeOptionGroup(group: DestAST.OptionGroup, indentation: string) {
  const special = encodeSpecialOptionGroup(group, indentation);
  const trailing = encodeTrailingOpts(group);
  const join = special.trim() !== "" && trailing ? ", " : "";
  return `${group.key}: ${special}${join}${trailing}`;
}

function encodeSpecialOptionGroup(
  optionGroup: DestAST.OptionGroup,
  indentation: string
) {
  switch (optionGroup.key) {
    case "id":
      return `${encodeString(optionGroup.value)}`;
    case "polar domain":
    case "domain":
    case "slider":
    case "cdf":
      return optionGroup.value !== undefined
        ? encodeInterval(optionGroup.value)
        : "";
    case "fps":
      return encodeLatex(optionGroup.value) ?? "";
    case "color":
    case "label":
    case "name":
    case "clickable label":
      return optionGroup.value !== undefined
        ? encodeString(optionGroup.value) + " "
        : "";
    case "regression":
      return optionGroup.parameters !== undefined
        ? `{${encodeRegressionParameters(optionGroup.parameters)}}`
        : "";

    case "clickable rules":
      return encodeClickableRules(optionGroup.value, indentation);
    default:
      return "";
  }
}

function encodeTrailingOpts(optionGroup: DestAST.OptionGroup) {
  return [
    ...("flags" in optionGroup ? optionGroup.flags : []),
    ...("opts" in optionGroup
      ? Object.entries(optionGroup.opts).map(
          ([key, value]) => `${key}=${encodeLatex(value)}`
        )
      : []),
  ].join(", ");
}

function encodeRegressionParameters(parameters: DestAST.RegressionParameter[]) {
  return parameters.length > 0
    ? parameters
        .map(({ parameter, value }) => `${encodeLatex(parameter)}=${value}`)
        .join(", ")
    : " ";
}

function encodeString(s: string) {
  return `"${s.replace('"', '""')}"`;
}

function encodeLatexList(list: DestAST.Latex[]) {
  return `[${list.map(encodeLatex).join(", ")}]`;
}

function encodeInterval(interval: DestAST.Interval) {
  const stepString = interval.step !== undefined ? ":" + interval.step : "";
  return `[${interval.min ?? ""}:${interval.max ?? ""}${stepString}]`;
}

function parseLatex(latex: string): DestAST.Latex {
  // TODO: actually parse
  return {
    type: "raw-latex",
    value: latex,
  };
}

function encodeLatex(latex: DestAST.Latex) {
  return "`" + latex.value.replace(/`/g, "``") + "`";
}
