import * as DestAST from "./dest-ast";

const INDENT = "  ";

export default function destASTToString(destAST: DestAST.Program) {
  return destAST.lines.map(encodeLine).join("\n");
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

function encodeLine(line: DestAST.Line) {
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
      return encodeItemLine(line, "");
  }
}

function encodeItemLine(line: DestAST.ItemLine, indentation: string): string {
  const smallFlagsString = line.smallFlags.map((c) => c + " ").join();
  const affixGroupString = encodeAffixGroup(line.affixGroup, indentation);
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

function encodeAffixGroup(affixGroup: DestAST.AffixGroup, indentation: string) {
  switch (affixGroup.key) {
    case "folder":
      let childrenString =
        "\n" +
        affixGroup.children
          .map((line) => encodeItemLine(line, indentation + INDENT))
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
function encodeLatex(latex: DestAST.Latex) {
  return "`" + latex.value.replace(/`/g, "``") + "`";
}
