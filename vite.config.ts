import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const threeUiEntry = fileURLToPath(new URL("./src/threeui-entry.tsx", import.meta.url));
const threeUiStyles = fileURLToPath(new URL("./src/shaders/threeui.css", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^designcodeio\/threeui\/style\.css$/, replacement: threeUiStyles },
      { find: /^designcodeio\/threeui$/, replacement: threeUiEntry },
    ],
  },
});
