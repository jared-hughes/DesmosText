import * as CalcState from "./calc-state-ts/state";
import * as DestAST from "./dest-ast";

export default function jsonToDestAST(stateString: string) {
  const state = JSON.parse(stateString) as CalcState.State;
  // TODO: use AJV to perform a full check
  if (state.version !== 8) {
    throw "Desmos JSON versions other than 8 are not currently supported";
  }
  return translateJSON(state);
}

function translateJSON(state: CalcState.State): DestAST.Program {
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
          rules: translateClickableRules(item.clickableInfo?.rules ?? []),
        };
        // for simulations: `playing` (`not playing` is default, omitted)
        item.isPlaying && smallFlags.push("playing");
        // (for simulations) `fps:` fps as a math_expr
        item.fps !== undefined &&
          optionGroups.push({
            key: "fps",
            value: transformLatex(item.fps),
          });
        break;
      case "expression":
        affixGroup = {
          key: "expr",
          expr: transformLatex(item.latex ?? ""),
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
                width: transformLatex(item.width),
              }),
              ...(item.height !== undefined && {
                height: transformLatex(item.height),
              }),
              ...(item.center !== undefined && {
                center: transformLatex(item.center),
              }),
              ...(item.angle !== undefined && {
                angle: transformLatex(item.angle),
              }),
              ...(item.opacity !== undefined && {
                opacity: transformLatex(item.opacity),
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

function translateClickableRules(rules: CalcState.ClickableInfoRules) {
  return rules.map((rule) => ({
    id: rule.id,
    expression: transformLatex(rule.expression),
    assignment: transformLatex(rule.assignment),
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
      value: translateClickableRules(item.clickableInfo.rules),
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
          parameter: transformLatex(key),
          value: value,
        })
      ),
      opts: item.residualVariable
        ? { residualVariable: transformLatex(item.residualVariable) }
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
      ...(slider.min !== undefined ? { min: transformLatex(slider.min) } : {}),
      ...(slider.max !== undefined ? { max: transformLatex(slider.max) } : {}),
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
        min: transformLatex(item.polarDomain.min),
        max: transformLatex(item.polarDomain.max),
      },
    });
  }
  // `domain`: parametric domain as an interval, such as `domain: [0:1]`
  //  (assumes `domain` and `parametricDomain` are the same always; from testing, `domain` has no effect)
  if (item.domain !== undefined) {
    optionGroups.push({
      key: "domain",
      value: {
        min: transformLatex(item.domain.min),
        max: transformLatex(item.domain.max),
      },
    });
  }
  // `cdf: show`; `cdf: hide` is default, omitted
  // `cdf`: integration bounds as an interval, such as `cdf: [1:8]`
  if (item.cdf !== undefined) {
    let cdfInterval: DestAST.Interval = {};
    if (item.cdf.min !== undefined) {
      cdfInterval.min = transformLatex(item.cdf.min);
    }
    if (item.cdf.max !== undefined) {
      cdfInterval.max = transformLatex(item.cdf.max);
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
        ...("labelSize" in item && {
          size: transformLatex(item.labelSize ?? ""),
        }),
        ...("labelAngle" in item && {
          angle: transformLatex(item.labelAngle ?? ""),
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
        breadth: transformLatex(vizProps.breadth),
      }),
      ...(vizProps?.axisOffset !== undefined && {
        offset: transformLatex(vizProps.axisOffset),
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
          opacity: transformLatex(item.pointOpacity ?? ""),
        }),
        ...("pointSize" in item && {
          size: transformLatex(item.pointSize ?? ""),
        }),
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
          opacity: transformLatex(item.lineOpacity ?? ""),
        }),
        ...("lineWidth" in item && {
          size: transformLatex(item.lineWidth ?? ""),
        }),
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
          ? { opacity: transformLatex(item.fillOpacity ?? "") }
          : {},
    });
  }
  // `color`: color, such as `color: #000000`
  // `color: var = c_x`;
  optionGroups.push({
    key: "color",
    ...("color" in item && { value: item.color }),
    opts:
      "colorLatex" in item
        ? { var: transformLatex(item.colorLatex ?? "") }
        : {},
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
  return {
    values: item.values.map(transformLatex),
    ...(item.latex !== undefined ? { header: transformLatex(item.latex) } : {}),
    smallFlags: item.hidden ? ["hidden" as const] : [],
    optionGroups: getCommonOptionGroups(item),
  };
}

function transformLatex(latex: string): DestAST.Latex {
  // TODO: actually parse the latex
  return {
    type: "raw-latex",
    value: latex,
  };
}
