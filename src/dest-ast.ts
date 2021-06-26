export interface Program {
  lines: Line[];
}

// TODO: handle full math AST
export type Latex = {
  type: "raw-latex";
  value: string;
};

export type Line = SettingLine | ItemLine;

/*** SETTING LINE ***/

export type SettingLine =
  | {
      type: "setting-seed";
      seed: string;
    }
  | {
      type: "setting-flags";
      flags: string[];
    }
  | {
      type: "setting-viewport";
      x?: NumberInterval;
      y?: NumberInterval;
    }
  | {
      type: "setting-minor-subdivisions";
      x?: number;
      y?: number;
    }
  | {
      type: "setting-axis-steps";
      x?: number;
      y?: number;
    }
  | {
      type: "setting-axis-arrows";
      x?: ArrowMode;
      y?: ArrowMode;
    }
  | {
      type: "setting-axis-labels";
      x?: string;
      y?: string;
    }
  | {
      type: "setting-axes";
      x?: ShowOrHide;
      y?: ShowOrHide;
    }
  | {
      type: "setting-axis-numbers";
      x?: ShowOrHide;
      y?: ShowOrHide;
      polar?: ShowOrHide;
    };

export interface NumberInterval {
  start: number;
  end: number;
}

export type ArrowMode = "none" | "positive" | "both";

export type ShowOrHide = "show" | "hide";

/*** ITEM LINE ***/

export interface ItemLine {
  type: "item-line";
  smallFlags: SmallFlag[];
  affixGroup: AffixGroup;
  optionGroups: OptionGroup[];
}

export type SmallFlag =
  | "secret"
  | "hidden"
  | "foreground"
  | "draggable"
  | "playing"
  | "collapsed";

export type AffixGroup =
  | {
      key: "folder";
      title?: string;
      children: ItemLine[];
    }
  | {
      key: "table";
      columns: ColumnLine[];
    }
  | {
      key: "simulation";
      rules: ClickableRule[];
    }
  | {
      key: "expr";
      expr?: Latex;
    }
  | {
      key: "image";
      imageURL: string;
    }
  | {
      key: "note";
      text?: string;
    };

export interface ColumnLine {
  smallFlags: SmallFlag[];
  header?: Latex;
  values: Latex[];
  optionGroups: OptionGroup[];
}

export interface ClickableRule {
  id: string;
  expression: Latex;
  assignment: Latex;
}

export type OptionGroup =
  | {
      key: "id";
      value: string;
    }
  | {
      key: "polar domain" | "domain";
      value: Interval;
    }
  | {
      key: "color";
      // should be a hex code or similar
      value?: string;
      opts: {
        var?: Latex;
      };
    }
  | {
      key: "label";
      value?: string;
      opts: {
        size?: Latex | "small" | "medium";
        angle?: Latex;
        // TODO: labelOrientation flags
      };
      flags: Array<
        | "show"
        | "editable math"
        | "editable text"
        | "show on hover"
        | "no outline"
      >;
    }
  | {
      key: "slider";
      value?: Interval;
      opts: {
        period?: number;
      };
      flags: Array<
        | "hard min"
        | "hard max"
        | "loop forward"
        | "once forward"
        | "forever forward"
        | "playing"
        | "left"
      >;
    }
  | {
      key: "cdf";
      value?: Interval;
      flags: Array<"show">;
    }
  | {
      key: "regression";
      parameters: RegressionParameter[];
      opts: {
        residualVariable?: Latex;
      };
      flags: Array<"log mode">;
    }
  | {
      key: "fps";
      value: Latex;
    }
  | {
      key: "clickable rules";
      value: ClickableRule[];
      flags: Array<"disabled">;
    }
  | {
      key: "clickable label";
      value: string;
    }
  | {
      key: "name";
      value: string;
    }
  | {
      key: "display";
      flags: Array<"fraction">;
    }
  | {
      key: "bins aligned";
      flags: Array<"left">;
    }
  | {
      key: "histogram mode";
      flags: Array<"relative" | "density">;
    }
  | {
      key: "drag";
      flags: Array<"x" | "y" | "xy">;
    }
  | {
      key: "points";
      flags: Array<"show" | "hide" | "open" | "cross">;
      opts: {
        opacity?: Latex;
        size?: Latex;
      };
    }
  | {
      key: "lines";
      flags: Array<"show" | "hide" | "dashed" | "dotted">;
      opts: {
        opacity?: Latex;
        width?: Latex;
      };
    }
  | {
      key: "fill";
      flags: Array<"show" | "hide">;
      opts: {
        opacity?: Latex;
      };
    }
  | {
      key: "boxplot";
      breadth?: Latex;
      offset?: Latex;
      flags: Array<"aligned to y" | "include outliers">;
    }
  | {
      key: "dotplot";
      flags: Array<"binned x">;
    }
  | {
      key: "image";
      opts: {
        width?: Latex;
        height?: Latex;
        center?: Latex;
        angle?: Latex;
        opacity?: Latex;
      };
    };

export interface RegressionParameter {
  parameter: Latex;
  value: number;
}
export interface Interval {
  min?: Latex;
  max?: Latex;
  step?: Latex;
}
