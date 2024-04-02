import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import aws from "astro-sst";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  adapter: aws(),
  integrations: [react(), tailwind()],
  vite: {
    plugins: [TanStackRouterVite()],
  },
});
