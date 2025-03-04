import * as esbuild from "esbuild";
import fs from "fs";
import json5 from "json5";
import { defineConfig } from "tsup";

const outDir = "dist";
mkdirSync(outDir);


export default defineConfig({
  entry: ["src/**/*.ts"],
  outDir,
  format: ["esm", "cjs"],
  outExtension: (ctx) => ({
    js: ctx.format === "cjs" ? ".js" : ".mjs",
    dts: ".d.ts",
  }),
  bundle: false,
  esbuildPlugins: [createPackageJson(), createSubPackages()],
});

function createPackageJson(): esbuild.Plugin {
  return createPostPlugin("package-json", () => {
    const pkgString = fs.readFileSync("package.json", "utf8");
    const pkg = JSON.parse(pkgString);
    delete pkg.devDependencies;
    delete pkg.scripts;

    pkg.main = "index.js";
    pkg.module = "index.mjs";
    fs.writeFileSync(`${outDir}/package.json`, JSON.stringify(pkg, null, 2));
    fs.copyFileSync("license", `${outDir}/license`);
    fs.copyFileSync("readme.md", `${outDir}/readme.md`);
  });
}

function createSubPackages(): esbuild.Plugin {
  return createPostPlugin("sub-packages", () => {
    const tsconfigString = fs.readFileSync("tsconfig.json", "utf8");
    const tsconfig = json5.parse(tsconfigString);

    const { paths } = tsconfig.compilerOptions;
    delete paths["@sinclair/typebox"];

    for (const name in paths) {
      const dir = `${outDir}/${name.replace("@sinclair/typebox/", "")}`;
      mkdirSync(dir);

      const pkg = {
        name,
        main: "index.js",
        module: "index.mjs",
      };
      fs.writeFileSync(`${dir}/package.json`, JSON.stringify(pkg, null, 2));
    }
  });
}

function createPostPlugin(name: string, fn: () => void): esbuild.Plugin {
  return {
    name,
    setup(build) {
      build.onEnd(() => {
        setTimeout(fn, 1);
      });
    },
  };
}

function mkdirSync(name: string) {
  try {
    fs.mkdirSync(name);
  } catch {}
}
