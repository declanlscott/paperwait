export const domain =
  {
    production: "paperwait.app",
    dev: "dev.paperwait.app",
  }[$app.stage] ?? $app.stage + ".dev.paperwait.app";
