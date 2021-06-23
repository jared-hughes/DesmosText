/* Currently just a cat program */

const { readFile } = require("fs/promises");

// note to self: use minimist library if you need more arg parsing
const args = process.argv.slice(2);
if (args.length !== 1) {
  throw "Incorrect number of args. Expected 1 arg: filename";
} else {
  translate(args[0]);
}

async function translate(filename: string) {
  const source = (await readFile(filename)).toString();
  console.log(source);
}
