import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const slash = (value) => value.split(path.sep).join("/");
const nativeControls = new Set([
  "button",
  "input",
  "textarea",
  "select",
  "label",
]);
const primitivePackages = /^(?:@radix-ui\/|radix-ui$|vaul$|cmdk$)/;
const colorLiteral =
  /^(?:#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|color)\s*\()/i;
const paletteUtility =
  /(?:^|[\s:'"\]])(?:bg|text|border|ring|fill|stroke|outline|shadow|from|via|to|divide|decoration|accent|caret)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?=[\s/'"\]]|$)/;
const arbitraryColorUtility =
  /(?:bg|text|border|ring|fill|stroke|outline|shadow|from|via|to|divide|decoration|accent|caret)-\[\s*(?:#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|color)\s*\()/i;
const compatibilityComponents = new Set(["toast", "toaster"]);
const overlayComponents = new Set([
  "dialog",
  "alert-dialog",
  "drawer",
  "sheet",
]);

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(filename) : [filename];
  });
}
function propertyName(node) {
  return node && (ts.isIdentifier(node) || ts.isStringLiteral(node))
    ? node.text
    : "";
}
function stringValue(node) {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}
function resolvedModule(filename, specifier) {
  if (specifier.startsWith("@/"))
    return path.join(projectRoot, "src", specifier.slice(2));
  if (specifier.startsWith("."))
    return path.resolve(path.dirname(filename), specifier);
  return null;
}
function containsA11yBypass(node) {
  if (!ts.isObjectLiteralExpression(node)) return false;
  return node.properties.some((prop) => {
    if (!ts.isPropertyAssignment(prop)) return false;
    const key = propertyName(prop.name);
    return (
      (key === "disable" &&
        prop.initializer.kind === ts.SyntaxKind.TrueKeyword) ||
      (key === "enabled" &&
        prop.initializer.kind === ts.SyntaxKind.FalseKeyword) ||
      (key === "test" && stringValue(prop.initializer) !== "error") ||
      containsA11yBypass(prop.initializer) ||
      (ts.isArrayLiteralExpression(prop.initializer) &&
        prop.initializer.elements.some(containsA11yBypass))
    );
  });
}

/** Return violations without mutating files; tests can use isolated fixture roots. */
export function checkUiPolicy(root = projectRoot) {
  const failures = [];
  const storyImports = new Set();
  const filenames = [
    ...filesUnder(path.join(root, "src")),
    ...filesUnder(path.join(root, ".storybook")),
  ];
  const report = (filename, source, node, rule, message) => {
    const position = source
      ? source.getLineAndCharacterOfPosition(node.getStart(source))
      : { line: 0, character: 0 };
    failures.push({
      file: slash(path.relative(root, filename)),
      line: position.line + 1,
      column: position.character + 1,
      rule,
      message,
    });
  };
  // Resolve against the provided project root, including relative imports and re-exports.
  const resolve = (filename, specifier) => {
    const modulePath = resolvedModule(filename, specifier);
    return specifier.startsWith("@/")
      ? path.join(root, "src", specifier.slice(2))
      : modulePath;
  };
  for (const filename of filenames) {
    const relative = slash(path.relative(root, filename));
    const contents = fs.readFileSync(filename, "utf8");
    if (filename.endsWith(".css")) {
      if (
        relative !== "src/shared/design-system/tokens.css" &&
        /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\s*\(/i.test(
          contents.replace(/\/\*[\s\S]*?\*\//g, ""),
        )
      ) {
        report(
          filename,
          null,
          null,
          "UI003",
          "Declara colores literales en tokens.css; consume roles semánticos en los demás estilos.",
        );
      }
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(filename)) continue;
    const source = ts.createSourceFile(
      filename,
      contents,
      ts.ScriptTarget.Latest,
      true,
      filename.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const inUi = relative.startsWith("src/shared/ui/");
    const inStory = relative.includes(".stories.");
    const checkImport = (specifier, node) => {
      if (!inUi && primitivePackages.test(specifier))
        report(
          filename,
          source,
          node,
          "UI002",
          "Importa el componente de shared/ui; los primitivos externos se encapsulan en la biblioteca.",
        );
      const target = resolve(filename, specifier);
      if (!target) return;
      const targetRelative = slash(path.relative(root, target)).replace(
        /\.[cm]?[jt]sx?$/,
        "",
      );
      if (inStory) storyImports.add(targetRelative);
      if (
        relative.startsWith("src/shared/") &&
        /^src\/(features|core|app)(?:\/|$)/.test(targetRelative)
      ) {
        report(
          filename,
          source,
          node,
          "UI004",
          "shared no depende de app, core ni features, tampoco mediante imports relativos.",
        );
      }
      if (
        relative.startsWith("src/core/") &&
        /^src\/(features|app)(?:\/|$)/.test(targetRelative)
      ) {
        report(
          filename,
          source,
          node,
          "UI004",
          "core no depende de app ni features; ensambla en app/_composition.",
        );
      }
      if (
        !inUi &&
        overlayComponents.has(path.basename(targetRelative)) &&
        targetRelative.startsWith("src/shared/ui/")
      ) {
        report(
          filename,
          source,
          node,
          "UI005",
          "Los flujos de producto usan SidePanel + PanelHost; los overlays heredados son de compatibilidad.",
        );
      }
    };
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        stringValue(node.moduleSpecifier) !== null
      ) {
        checkImport(stringValue(node.moduleSpecifier), node);
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        stringValue(node.arguments[0]) !== null
      ) {
        checkImport(stringValue(node.arguments[0]), node);
      }
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        !inUi
      ) {
        const name = node.tagName.getText(source);
        if (nativeControls.has(name))
          report(
            filename,
            source,
            node,
            "UI001",
            `Usa el control de shared/ui en lugar de <${name}>.`,
          );
        if (
          name === "motion.button" &&
          relative !== "src/app/_components/panel-host.tsx"
        ) {
          const className = node.attributes.properties.find(
            (prop) => ts.isJsxAttribute(prop) && prop.name.text === "className",
          );
          if (
            !className ||
            !stringValue(className.initializer)
              ?.split(/\s+/)
              .includes("ui-interactive-card")
          ) {
            report(
              filename,
              source,
              node,
              "UI001",
              "motion.button se reserva para tarjetas con ui-interactive-card; usa Button para las demás acciones.",
            );
          }
        }
      }
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        if (
          paletteUtility.test(node.text) ||
          arbitraryColorUtility.test(node.text)
        )
          report(
            filename,
            source,
            node,
            "UI003",
            "Usa colores semánticos del kit, no paletas Tailwind literales.",
          );
        if (
          colorLiteral.test(node.text) &&
          !(relative === "src/app/layout.tsx" && isViewportMetadata(node))
        ) {
          report(
            filename,
            source,
            node,
            "UI003",
            "Usa var(--token) o clases semánticas; los colores literales se declaran en tokens.css.",
          );
        }
      }
      if (
        ts.isPropertyAssignment(node) &&
        propertyName(node.name) === "a11y" &&
        containsA11yBypass(node.initializer)
      ) {
        report(
          filename,
          source,
          node,
          "UI008",
          "No desactives ni rebajes los chequeos a11y de las historias; corrige el componente.",
        );
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const catalogFile = path.join(root, "src/shared/design-system/catalog.ts");
  const uiFiles = filesUnder(path.join(root, "src/shared/ui")).filter(
    (file) => file.endsWith(".tsx") && !file.includes(".stories."),
  );
  const catalog = new Map();
  if (fs.existsSync(catalogFile)) {
    const source = ts.createSourceFile(
      catalogFile,
      fs.readFileSync(catalogFile, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function read(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const values = Object.fromEntries(
          node.properties
            .filter(ts.isPropertyAssignment)
            .map((prop) => [
              propertyName(prop.name),
              stringValue(prop.initializer),
            ]),
        );
        if (values.name && values.source) {
          if (catalog.has(values.name))
            report(
              catalogFile,
              source,
              node,
              "UI006",
              `Componente duplicado en el inventario: ${values.name}.`,
            );
          catalog.set(values.name, values);
        }
      }
      ts.forEachChild(node, read);
    }
    read(source);
  }
  for (const filename of uiFiles) {
    const name = path.basename(filename, ".tsx");
    const entry = catalog.get(name);
    if (!entry || entry.source !== `@/shared/ui/${name}`)
      report(
        filename,
        null,
        null,
        "UI006",
        "Registra el componente con su import real en design-system/catalog.ts.",
      );
    if (
      entry &&
      ((entry.status !== "ready" && entry.status !== "compatibility") ||
        (entry.status === "compatibility" &&
          !compatibilityComponents.has(name)))
    )
      report(
        filename,
        null,
        null,
        "UI006",
        "Los componentes nuevos usan status ready; compatibility solo aplica a Toast/Toaster heredados.",
      );
    if (
      entry &&
      !compatibilityComponents.has(name) &&
      !storyImports.has(`src/shared/ui/${name}`)
    )
      report(
        filename,
        null,
        null,
        "UI007",
        "Añade una historia que importe este componente; puede compartir archivo con otros ejemplos.",
      );
  }
  for (const [name] of catalog) {
    if (!uiFiles.some((file) => path.basename(file, ".tsx") === name))
      report(
        catalogFile,
        null,
        null,
        "UI006",
        `El inventario apunta a un componente inexistente: ${name}.`,
      );
  }
  return failures;
}
function isViewportMetadata(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isVariableDeclaration(parent) &&
      propertyName(parent.name) === "viewport"
    )
      return true;
  }
  return false;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const failures = checkUiPolicy();
  for (const item of failures)
    console.error(
      `${item.file}:${item.line}:${item.column} ${item.rule} ${item.message}`,
    );
  if (failures.length) {
    console.error(
      `\nPOLIS UI: ${failures.length} incumplimiento(s). Consulta docs/kit-ui-rules.md.`,
    );
    process.exitCode = 1;
  } else
    console.log(
      "POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.",
    );
}
