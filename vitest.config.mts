import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        resolve: { alias: { "@": path.join(dirname, "src") } },
        test: {
          name: "plataforma",
          environment: "node",
          include: [
            "src/features/plataforma/**/*.test.ts",
            "src/features/fuentes/**/*.test.ts",
            "src/features/actores/**/*.test.ts",
            "src/features/sesion/services/sincronizar-sesion.test.ts",
          ],
        },
      },
      {
        extends: true,
        resolve: { alias: { "@": path.join(dirname, "src") } },
        test: {
          name: "formularios",
          environment: "node",
          include: ["src/features/formularios/**/*.test.ts"],
        },
      },
      {
        extends: true,
        optimizeDeps: {
          include: ["next/link", "ol/Feature", "ol/geom/Point", "uuid"],
        },
        plugins: [
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
