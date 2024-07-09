import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";

import type { OutputOptions, RollupBuild } from 'rollup'
import type { RollupOptions } from "rollup";

function writeBundles(bundle: RollupBuild, options: OutputOptions[]) {
  return Promise.all(options.map((option) => bundle.write(option)))
}

export const buildESM = async () => {
  const rollupConfig = {
    plugins: [
      nodeResolve({
        extensions: [".mjs", ".js", ".json", ".ts"],
      }),
      commonjs(),
      esbuild({
        define: {
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        sourceMap: false,
        target: 'esnext',
        exclude: [],
        treeShaking: true,
        legalComments: "eof",
      }),
    ],
    external: {},
    treeshake: true,
  } as RollupOptions;

  const bundle = await rollup({
    input: './leader-line.js',
    ...rollupConfig
  });
  await writeBundles(bundle, [
    {
      name: "CxDefinition",
      format: "esm",
      globals: {},
      file: `./leader-line.esm.js`,
      exports: "named",
      sourcemap: false,
    },
  ]);
};
