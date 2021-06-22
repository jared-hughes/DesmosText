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

An item consists of one or more option groups, separated by semicolons (`;`). An option group can be:

- The type-specific object. If present, this must come first, and this is necessary to specify that an item is a non-expression, such as an image or folder
  - For expressions, this is a math expression, e.g. `y=2x`.
  - For images, this is the `image_url` data URL, e.g. `image "data:image/png,..."`
  - For tables, this is the table columns (rest of syntax TODO) - ???
  - For folders, this is the folder title, e.g. `folder` (no title) or `folder "My awesome folder"`
  - For notes, this is the note content, e.g. `note` (empty note) or `note "Do some math"`
  - For simulations, this is empty (rest of syntax TODO) - ???
- a small flag

  - for all: `secret`
  - for expressions, images, folders: `hidden`

- a namespace, followed by a colon (`:`), followed by one or more options separated by commas (`,`). An option can be:

  - A flag:

    - `display: fraction`: expression value display mode (`float` is default, omitted)
    - `bins aligned: left`: for histograms & dotplots (`center` is default, omitted)
    - `histogram mode: relative` and `histogram mode density` (`count` is default, omitted)
    - `drag: x`, `drag: y`, `drag: xy`: drag mode (`none` is default, omitted)
    - `label: show`, `label: hide`
    - `label: placement below left`, `label: placement right`, ...
      - `labelOrientation` is different from `extendedLabelOrientation`. I don't understand either well enough, so I'm not going to implement/list all of the possible orientations yet. (???)
    - `label: editable math`, `label: editable text`; no default
    - `label: show on hover` (doesn't show if `show label` is disabled); `label: show always` is default, omitted
    - `label: no outline`; `label: outline` is default, omitted
    - `points: show`, `points: hide`
    - `points: open`, `points: cross`; `points: dot` is default, omitted
    - `lines: show`, `lines: hide`
    - `lines: dashed`, `lines: dotted`; `lines: solid` is default, omitted
    - `fill: show`, `fill: hide`
    - `regression: log mode`; `regression: no log mode` is default, omitted
    - `slider: hard min`; `slider: soft min` is default, omitted
    - `slider: hard max`; `slider: soft max` is default, omitted
    - `slider: loop backward`, `slider: once forward`, `slider: forever forward`; `slider: loop forward` is default
    - `boxplot: aligned to y`; `boxplot: aligned to x` is default, omitted
    - `boxplot: include outliers`; `boxplot: exclude outliers` is default, omitted
    - `dotplot: binned x`; `dotplot: exact x` is default, omitted
    - `cdf: show`; `cdf: hide`
    - `image: foreground` (`background` is default, omitted)
    - `image: draggable` (`not draggable` is default, omitted)
    - `simulation: playing` (`not playing` is default, omitted)
    - `simulation: enabled` (`disabled` is default, omitted)

  - An object of a broad type. If present, this must be immediately after the namespace name

    - `id:` ID as a string, such as `id: "7"`
    - `polar domain`: polar domain as an interval, such as `polar domain: [0:2*pi]`
    - `domain`: parametric domain as an interval, such as `domain: [0:1]` (assumes `domain` and `parametricDomain` are the same always; from testing, `domain` has no effect)
    - `color`: color, such as `color: #000000`
    - `label`: label string, such as `label: "Origin"`
    - `slider`: slider bounds as an interval, such as `slider: [0:5:1]`
    - `cdf`: integration bounds as an interval, such as `cdf: [1:8]`
    - `regression: {a: 0.01, b: 47}` How to handle regressionParameters ???

  - A key, followed by an equals sign (`=`), followed by a math expression value

    - `label: size = 5+u` (besides math expressions, `small`, `medium` and `large` are accepted)
    - `color: var = c_x`
    - `points: opacity = v_{a}`
    - `lines: opacity = 0.5k`
    - `lines: width = 5+c`
    - `fill: opacity = 0.5k`
    - `regression: residuals = e_{1}`
    - `slider: period = 8000` (4000 is 1x, 8000 is 0.5x, etc. Support `4x` notation???)
    - `boxplot: breadth = 5`
    - `boxplot: offset = 3`
    - `dotplot: size = 5` (dotplotSize appears deprecated, but including anyways)
    - `image: width = 10`
    - `image: height = 7`
    - `image: center = (3,3)`
    - `image: angle = 4*pi`
    - `image: opacity = 0.8`
    - `simulation: fps = 59`

```
; nested folders are a compile-time error, but the parser will accept it
item_line →
  | initial_group | initial_group ";" SEP<option_group, ";">
  | ("hidden" | "collapsed" | "secret")* folder string? "{" item_line* "}"
initial_group →
  | math_expr
  | "image" string
  | "table" <??? TODO>
  | "folder" string?
  | "note" string?
  | "simulation" <??? TODO>
option_group →
  | small_flag
  | "id" ":" string
  | expression_option
  | key ":" option_or_flag trailing_opts
expression_option →
  | "polar" "domain" ":" interval
  | "domain" ":" interval
  | "color" ":" hex_code trailing_opts
  | "label" ":" string trailing_opts
  | "slider" ":" interval trailing_opts
  | "cdf" ":" interval trailing_opts
  | "regression" ":" regression_parameters trailing_opts
image_option →
  | "name" ":" string
  |
small_flag → "secret" | "hidden" | "foreground" | "background"
trailing_opts → ("," option_or_flag)*
option_or_flag → key "=" math_expr | flag
key → words
flag → words
words → (letter | non-newline whitespace)+
interval → "[" math_expr ":" math_expr (":" math_expr)? "]"
```

## Behavior

Mismatching options (such as `loop backward` not inside the `slider` namespace), are treated as compile-time errors.

Desmos automatically prunes keys (using `delete obj[key]`) that are the same as the default (presumably to save server space/bandwidth). Hence default options such as `label: outline` are omitted from processing because they carry no information.

If an item line specifies something twice, the former gets overriden and a compile-time warning is emitted.

### Colors

The predefined colors in Desmos are

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
y=x; color: #000
(0,0); label "Origin", show
y=sin(x); hidden
x=2; lines: dotted, width=5, opacity=0.8
(0,[1...5]); points: show, cross; lines: hide
a=0; slider: [0:1], loop forward
```
