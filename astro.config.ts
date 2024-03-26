import react from "@astrojs/react";
import aws from "astro-sst";
import stylex from "astro-stylex";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  adapter: aws(),
  integrations: [react(), stylex()],
});
