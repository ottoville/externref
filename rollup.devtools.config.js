import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
export default {
  input: "./src/ui/DevTools/DevToolsApp.tsx",
  output: {
    dir: "wwwroot/js/ui/DevTools",
    format: "es",
  },
  external: (a, b, c) => {
    if (a.includes("react")) return false;
    if (!b) return false;
    if (a.endsWith(".tsx") || a.endsWith(".jsx") || a.endsWith(".ts"))
      return false;
    if (
      a.replaceAll("\\", "/").includes("terrasim/src") ||
      b.replaceAll("\\", "/").includes("terrasim/src")
    ) {
      return true;
    }
    return false;
  },
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig:
        process.env.BUILD === "production"
          ? "./src/tsconfig.devtools.json"
          : "./src/tsconfig.devtools.debug.json",
    }),
    commonjs(),
  ],
};
