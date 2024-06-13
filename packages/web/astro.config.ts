import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import aws from "astro-sst";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: aws({
    deploymentStrategy: "regional",
    serverRoutes: ["api/*"],
  }),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    starlight({ title: "Paperwait" }),
  ],
  vite: { plugins: [TanStackRouterVite()] },
  security: {
    checkOrigin: true,
  },
});
