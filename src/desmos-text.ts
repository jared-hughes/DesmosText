import { readFile } from "fs/promises";
import jsonToDest from "./json-to-dest";
import * as path from "path";

// note to self: use minimist library if you need more arg parsing
const args = process.argv.slice(2);
if (args.length !== 1) {
  throw "Incorrect number of args. Expected 1 arg: filename";
} else {
  translate(args[0]);
}

async function translate(filename: string) {
  const source = (await readFile(filename)).toString();
  const extension = path.extname(filename);
  switch (extension) {
    case ".dest":
      throw "Compilation from .dest to Desmos JSON is not yet supported";
      break;
    case ".json":
      console.log(jsonToDest(source));
      break;
    default:
      throw `Unhandled file type: ${extension}`;
  }
}
