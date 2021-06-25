# State

This is the root-level language element.

## Interface

```ts
export interface State {
  version: 8;
  randomSeed?: string;
  graph: GrapherState;
  expressions: {
    list: ListState;
  };
}

type ArrowMode = "NONE" | "POSITIVE" | "BOTH";

interface GrapherState {
  viewport: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  xAxisMinorSubdivisions?: number;
  yAxisMinorSubdivisions?: number;
  degreeMode?: boolean;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  xAxisNumbers?: boolean;
  yAxisNumbers?: boolean;
  polarNumbers?: boolean;
  xAxisStep?: number;
  yAxisStep?: number;
  xAxisArrowMode?: ArrowMode;
  yAxisArrowMode?: ArrowMode;
  xAxisLabel?: string;
  yAxisLabel?: string;
  squareAxes?: boolean;
  restrictGridToFirstQuadrant?: boolean;
  polarMode?: boolean;
}

type ListState = ItemState[];

type ItemState =
  | ExpressionState
  | ImageState
  | TableState
  | FolderState
  | TextState
  | SimulationState;

interface BaseItemModel {
  id: ID;
  secret?: boolean;
}

interface FolderState extends BaseItemModel {
  type: "folder";
  hidden?: boolean;
  collapsed?: boolean;
  title?: string;
}
```

## Grammar

We are safe to use colons `:` unambiguously to define options because colons are invalid in all Desmos expressions (except in notes and image URLs, but those are wrapped in quotes to form strings).

The target Desmos version is always 8 for now. It may be a compiler option later.

In terms of parsing, it would be nice to parse up to a `:`, then spit out a clear error clearly stating if the setting is invalid (e.g. `seeeed: "abc"`).

A similar error handling can be easily achieved with the flags. Any string without newlines can be parsed as a flag, then a compile-time error can be thrown if a flag is invalid

```
state → line*
line → ε | setting_line | item_line
setting_line →
  | "flags" ":" SEP</[^\n]*/, ",">
  | "seed" ":" string
  | "viewport" ":" XY<number_interval>
  | "minor" "subdivisions" ":" XY<number>
  | "axis" "steps" ":" XY<number>
  | "axis" "arrows" ":" XY<arrow_mode>
  | "axis" "labels" ":" XY<string>
  | "axes" ":" XY<show_or_hide>
  | "axis" "numbers" ":" XYP<show_or_hide>
; used for intervals between two numbers
number_interval → "[" number ":" number "]"
; used for a pair of numbers
number_pair → "<" ">
arrow_mode → "<->" | "->" | "-"
; any character besides `"`, including newlines and `\`, can be written unescaped
; Use "" to get an actual quote character
string → '"' /(""|[^"])*/ '"'
XY<T> → "x" <T> | "y" <T> | "x" <T> "," "y" <T>
XYP<T> → XY<T> ("," "polar" <T>) | "polar" <T>
show_or_hide → "show" | "hide"
SEP<T, S> → <T> | SEP<T, S> <S> <T>
```

See also

- [Item](Item.md)

### Full list of flags:

Later-specified flags take precedence. The second flag of each pair has no effect (because they are the default) except to undo the first flag of each pair, if specified first.

- `degrees`, `radians`
- `hide grid`, `show grid`
- `polar grid`, `cartesian grid`
- `square axes`, `no square axes`
- `first quadrant`, `all quadrants`

## Example

```
seed: "abc"
viewport: x [-10:10], y [-6:6]
minor subdivisions: x 5, y 5
axis steps: x 2, y 1.2
axis arrows: x ->, y <->
axis labels: x "time", y "temperature"
axes: x show, y hide
axis numbers: x hide, polar show
flags: degrees, hide grid, square axes, first quadrant

note "The following folder is secret, so students cannot see it"
secret collapsed folder "Folder title" {
    note "Parabola parent function"
    y=x^2
}
```
