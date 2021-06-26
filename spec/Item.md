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

- The affix group (specific to the type of item). If present, this must come first (for expressions, images, and notes) or last (for folders, tables, and simulations)
  - For expressions, this is a math expression, e.g. `y=2x`.
  - For images, this is the `image_url` data URL, e.g. `image "data:image/png,..."`
  - For tables, this is the table columns as a list wrapped in braces
    - each column looks like a math expression, except it takes `column_latex: [math_expr, math_expr, ...]` instead of `math_expr`
    - e.g. `table { x_1: [1, 2, 3]; id: "3" }` or just `table { [4,5,6] }`
  - For folders, this is the folder title then the contents of the folder in braces, e.g. `folder {}` (no title, no contents) or `folder "My awesome folder" { y=x }`
    - each line inside can be any item, including folders. Nested folders would be a compile-time error though, but the parser will accept it
  - For notes, this is the note content, e.g. `note` (empty note) or `note "Do some math"`
  - For simulations, this is a list of clickable object rules, e.g. `simulation { a <- a+1, b <- a+b }`
- Immediately before the type-specific object may be one or more space-separated small flags. Valid options:

  - for all: `secret`
  - for expressions, images, folders, table columns: `hidden`
  - for images: `foreground` (`background` is default, omitted)
  - for images: `draggable` (`not draggable` is default, omitted)
  - for simulations: `playing` (`not playing` is default, omitted)
  - for folders: `collapsed` (`not collapsed` is default, omitted)

- a namespace, followed by a colon (`:`), followed by one or more options separated by commas (`,`). An option can be:

  - A flag:

    - `display: fraction`: expression value display mode (`float` is default, omitted)
    - `bins aligned: left`: for histograms & dotplots (`center` is default, omitted)
    - `histogram mode: relative` and `histogram mode: density` (`count` is default, omitted)
    - `drag: x`, `drag: y`, `drag: xy`: drag mode (`none` is default, omitted)
    - `label: show`; `label: hide` is default, omitted
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
    - `slider: loop forward`, `slider: once forward`, `slider: forever forward`; `slider: loop forward reverse` is default
    - `slider: playing` (`slider: not playing` is default, omitted)
    - `slider: left` for playDirection (`slider: right` is default, omitted)
    - `boxplot: aligned to y`; `boxplot: aligned to x` is default, omitted
    - `boxplot: include outliers`; `boxplot: exclude outliers` is default, omitted
    - `dotplot: binned x`; `dotplot: exact x` is default, omitted
    - `cdf: show`; `cdf: hide` is default, omitted
    - `clickable rules: {}, disabled`; (note `disabled` is default, so opposite mention in the graph state)

  - An object of a broad type. If present, this must be immediately after the namespace name

    - `id:` ID as a string, such as `id: "7"`
    - `polar domain`: polar domain as an interval, such as `polar domain: [0:2*pi]`
    - `domain`: parametric domain as an interval, such as `domain: [0:1]` (assumes `domain` and `parametricDomain` are the same always; from testing, `domain` has no effect)
    - `color`: color, such as `color: #000000`
    - `label`: label string, such as `label: "Origin"`
    - `slider`: slider bounds as an interval, such as `slider: [0:5:1]`
    - `cdf`: integration bounds as an interval, such as `cdf: [1:8]`
    - `regression: {a=0.01, b=47}` regression parameters as key-value pairs.
    - `clickable label:` description of clickable object, as a string
    - `clickable rules:` list of enabled clickable object rules (clickable rules enabled unless specified with disabled)
    - (for images) `name:` string
    - (for simulations) `fps:` fps as a math_expr

  - A key, followed by an equals sign (`=`), followed by a math expression value

    - `label: size = 5+u` (besides math expressions, `small`, `medium` and `large` are accepted)
    - `label: angle = pi/2`
    - `color: var = c_x`
    - `points: opacity = v_{a}`
    - `points: size = 2.5`
    - `lines: opacity = 0.5k`
    - `lines: width = 5+c`
    - `fill: opacity = 0.5k`
    - `regression: residuals = e_{1}`
    - `slider: period = 8000` (4000 is 1x, 8000 is 0.5x, etc. Support `4x` notation???)
    - `boxplot: breadth = 5`
    - `boxplot: offset = 3`
    - <s>`dotplot: size = 5` (dotplotSize appears vestigial)</s>
    - `image: width = 10`
    - `image: height = 7`
    - `image: center = (3,3)`
    - `image: angle = 4*pi`
    - `image: opacity = 0.8`

```
item_line →
  | small_flag* initial_group (";" option_group)*
  | (option_group ";")* small_flag* final_group
column_line → small_flag* column_values (";" option_group)*
final_group →
  | "folder" string? "{" item_line* "}"
  | "table" "{" column_line* "}"
  | "simulation" clickable_rules?
initial_group →
  | math_expr
  | "image" string
  | "note" string?
option_group →
  | "id" ":" string
  | "polar" "domain" ":" interval
  | "domain" ":" interval
  | "color" ":" hex_code? trailing_opts
  | "label" ":" string? trailing_opts
  | "slider" ":" interval? trailing_opts
  | "cdf" ":" interval? trailing_opts
  | "regression" ":" regression_parameters? trailing_opts
  | "fps" ":" math_expr
  | "clickable rules" ":" clickable_rules
  | "screen" "reader" "label" ":" string
  | "name" ":" string
  | key ":" option_or_flag trailing_opts
small_flag →
  | "secret"
  | "hidden"
  | "foreground"
  | "draggable"
  | "playing"
  | "collapsed"
column_values → (math_expr ":")? "[" SEP(math_expr, ",")? "]"
clickable_rules → "[" SEP(clickable_rule*, ",")? "]"
clickable_rule → math_expr "<-" math_expr (";" "id" : string)?
regression_parameters → "{" SEP(math_expr "=" number, ",") "}"
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

If an item line specifies something twice, that is a compile-time error.

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
