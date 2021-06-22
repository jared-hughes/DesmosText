# Expression

This is the language element for expressions in general, including function definitions, polygons, paramterics, polar equations, regressions, dot plots, histograms, etc.

```ts
interface ExpressionState extends NonfolderModel, MaybeClickable {
  type: "expression";
  color: string;
  latex?: Latex;
  showLabel?: boolean;
  label?: string;
  hidden?: boolean;
  points?: boolean;
  lines?: boolean;
  lineStyle?: LineStyle;
  pointStyle?: PointStyle;
  fill?: boolean;
  dragMode?: DragMode;
  labelSize?: LabelSize;
  labelOrientation?: LabelOrientation;
  // extendedLabelOrientation seems like it is renamed to labelOrientation in state version 9
  extendedLabelOrientation?: LabelOrientation;
  suppressTextOutline?: boolean;
  // interactiveLabel is show-on-hover
  interactiveLabel?: boolean;
  editableLabelMode?: "MATH" | "TEXT";
  residualVariable?: Latex;
  regressionParameters?: {
    // key is a LaTeX identifier
    [key: string]: number;
  };
  isLogModeRegression?: boolean;
  displayEvaluationAsFraction?: boolean;
  slider?: {
    hardMin?: boolean;
    hardMax?: boolean;
    animationPeriod?: number;
    loopMode?:
      | "LOOP_FORWARD_REVERSE"
      | "LOOP_FORWARD"
      | "PLAY_ONCE"
      | "PLAY_INDEFINITELY";
    playDirection?: 1 | -1;
    isPlaying?: boolean;
    min?: Latex;
    max?: Latex;
    step?: Latex;
  };
  polarDomain?: Domain;
  parametricDomain?: Domain;
  // seems like `domain` may be the same as `parametricDomain`
  domain?: Domain;
  cdf?: {
    show: boolean;
    min?: Latex;
    max?: Latex;
  };
  colorLatex?: Latex;
  fillOpacity?: Latex;
  lineOpacity?: Latex;
  pointOpacity?: Latex;
  pointSize?: Latex;
  lineWidth?: Latex;
  labelAngle?: Latex;
  vizProps?: {
    breadth?: Latex;
    axisOffset?: Latex;
    alignedAxis?: "x" | "y";
    showBoxplotOutliers?: boolean;
    // dotplotSize is removed in state version 9
    // "small" corresponds to pointSize=9; "large" corresponds to pointSize=20
    dotplotSize?: "small" | "large";
    binAlignment?: "left" | "center";
    // the string "binned" is never actually checked,
    // just inferred by the absence of "exact"
    dotplotXMode?: "exact" | "binned";
    // the string "count" is never actually checked,
    // just inferred by the absence of "relative" and "density"
    histogramMode?: "count" | "relative" | "density";
  };
}
interface NonfolderModel extends BaseItemModel {
  folderId?: ID;
}
interface MaybeClickable {
  clickableInfo?: {
    enabled?: boolean;
    // description is the screen reader label
    description?: string;
    rules?: ClickableInfoRules;
  };
}
type ClickableInfoRules = {
  // appears that `id: number` is removed
  id: string | number;
  expression: Latex;
  assignment: Latex;
}[];
type LineStyle = "SOLID" | "DASHED" | "DOTTED";
type PointStyle = "POINT" | "OPEN" | "CROSS";
type DragMode = "NONE" | "X" | "Y" | "XY";
type LabelSize = "SMALL" | "MEDIUM" | "LARGE" | Latex;
type LabelOrientation =
  | "default"
  | "center"
  | "center_auto"
  | "auto_center"
  | "above"
  | "above_left"
  | "above_right"
  | "above_auto"
  | "below"
  | "below_left"
  | "below_right"
  | "below_auto"
  | "left"
  | "auto_left"
  | "right"
  | "auto_right";
```

## Grammar

Unlike the other item types which have a prefix (`note`, `table`, etc.), expressions have no prefix, so at their minimum they could be just a single string like `y=1`.

Besides the expression content itself (which gets compiled to latex), further options can be specified in the following format:

- Each option is grouped to a namespace, e.g. `lines` or `slider`
- The options for each namespace must be separated from each other by semicolons (`;`)
- Some namespaces are really just a single flag or enum, so it's easiest to implement them as such:
  - `display fraction`: expression value display mode (`float` is default, omitted)
  - `bins aligned left`: for histograms & dotplots (`center` is default, omitted)
  - `histogram mode relative` and `histogram mode density` (`count` is default, omitted)
  - `drag x`, `drag y`, `drag xy`: drag mode (`none` is default, omitted)
- The rest of the options can be written by starting with the namespace name then:

  - (optionally) add an "obvious" argument
    - Argument list by namespace:
      - `color`: color (usually hex code)
      - `label`: label string
      - `slider`: slider bounds
      - `polar domain`: domain
      - `domain`: domain (assumes `domain` and `parametricDomain` are the same always; from testing, `domain` has no effect)
      - `cdf`: interval
    - e.g. `color #000`
    - e.g. `drag x`
    - e.g. `domain [0:1]`
  - (optionally) add options by adding a comma (`,`) followed by a flag or an option name followed by value

    - Flag list by namespace:

      - `label, show`, `label, hide`
      - `label, placement below left`

        - `labelOrientation` is different from `extendedLabelOrientation`. I don't understand either well enough, so I'm not going to implement/list all of the possible orientations yet. (???)

      - `label, editable math`, `label, editable text`; no default
      - `label, show on hover` (doesn't show if `show label` is disabled); `label, show always` is default, omitted
      - `label, no outline`; `label, outline` is default, omitted
      - `points, show`, `points, hide`
      - `points, open`, `points, cross`; `points, dot` is default, omitted
      - `lines, show`, `lines, hide`
      - `lines, dashed`, `lines, dotted`; `lines, solid` is default, omitted
      - `fill, show`, `fill, hide`
      - `regression, log mode`; `regression, no log mode` is default, omitted
      - `slider, hard min`; `slider, soft min` is default, omitted
      - `slider, hard max`; `slider, soft max` is default, omitted
      - `slider, loop backward`, `slider, once forward`, `slider, forever forward`; `slider, loop forward` is default
      - `boxplot, aligned to y`; `boxplot, aligned to x` is default, omitted
      - `boxplot, include outliers`; `boxplot, exclude outliers` is default, omitted
      - `dotplot, binned x`; `dotplot, exact x` is default, omitted
      - `cdf, show`; `cdf, hide`

    - Option list by namespace (with example value):

      - `label, size 5+u` (besides math expressions, `small`, `medium` and `large` are accepted)
      - `color, var c_x`
      - `points, opacity v_{a}`
      - `lines, opacity 0.5k`
      - `lines, width 5+c`
      - `fill, opacity 0.5k`
      - `regression, residuals e_{1}`
      - `regression, parameters {}` How to handle regressionParameters ???
      - `slider, period 8000` (4000 is 1x, 8000 is 0.5x, etc. Support `4x` notation???)
      - `boxplot, breadth 5`
      - `boxplot, offset 3`
      - `dotplot, size 5` (dotplotSize appears deprecated, but including anyways)

    - e.g. `slider [0:1], loop forward`
    - e.g. `show lines, opacity 0.5`

Desmos automatically prunes keys (using `delete obj[key]`) that are the same as the default (presumably to save server space/bandwidth). Hence default options such as `label, outline` are omitted because they carry no information.

### BNF-like

(Partial description)

```
; invalid options will be compile-time errors
namespace → namespace_maybe_arg options_list? ("," option)*
option → flag | key ":" value
namespace_maybe_arg → namespace_flag_only | namespace_with_arg
namespace_flag_only →
    | "display" "fraction"
    | "bins" "aligned" "left"
    | "histogram" "mode" "relative"
    | "histogram" "mode" "density"
    | "drag" "x"
    | "drag" "y"
    | "drag" "xy"
namespace_with_arg →
    | "color" color?
    | "slider" interval?
    | "polar domain" interval?
    | "domain" interval?
    | "cdf" interval?
    | maybe_show "label" string?
    | maybe_show "point"
    | maybe_show "lines"
    | maybe_show "fill"
    | maybe_show "cdf"
maybe_show = ("show" | "hide")?
interval → "[" math_expr ":" math_expr (":" math_expr)? "]"
```

## Behavior

The predefined colors are

```
black: "#000000"
blue: "#2d70b3"
green: "#388c46"
orange: "#fa7e19"
purple: "#6042a6"
red: "#c74440"
```

If not specified, expression color defaults to cycling among the predefined colors in the order `blue, green, purple, black, red` (`orange` excluded intentionally; this is the same order as what Desmos uses).

See also

- [MathExpr](MathExpr.md)

## Example

```
y=x^2
y=x; blue
(0,0); show label "Origin"
y=sin(x); hidden
x=2; solid
(0,[1...5]); show points; hide lines
```
