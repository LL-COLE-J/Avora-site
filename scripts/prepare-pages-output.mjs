import { cpSync, mkdirSync, rmSync } from "node:fs";

const pagesOutput = ".open-next/assets";

rmSync(pagesOutput, { force: true, recursive: true });
mkdirSync(".open-next", { recursive: true });
cpSync("out", pagesOutput, { recursive: true });
