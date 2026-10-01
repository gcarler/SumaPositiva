import type { Preview } from "@storybook/nextjs-vite";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import "../src/shared/design-system/styles.css";

const preview: Preview = {
  tags: ["autodocs"],
  globalTypes: {
    theme: {
      description: "Tema de POLIS",
      toolbar: {
        title: "Tema",
        icon: "circlehollow",
        dynamicTitle: true,
        items: [
          { value: "light", title: "Claro" },
          { value: "dark", title: "Oscuro" },
        ],
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    options: {
      storySort: {
        order: ["Fundamentos", "Componentes", "Patrones", "Plataforma"],
      },
    },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider
        attribute="class"
        forcedTheme={context.globals.theme === "dark" ? "dark" : "light"}
        storageKey="polis-storybook-theme"
        disableTransitionOnChange
      >
        <MotionConfig reducedMotion="user">
          {context.parameters.polis?.screen ? (
            <div lang="es" className="bg-background font-sans text-foreground">
              <Story />
            </div>
          ) : (
            <main
              lang="es"
              className="min-h-full bg-background p-2 font-sans text-foreground"
            >
              <Story />
            </main>
          )}
        </MotionConfig>
      </ThemeProvider>
    ),
  ],
};
export default preview;
