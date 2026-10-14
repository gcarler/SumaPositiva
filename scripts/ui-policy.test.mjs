import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkUiPolicy } from "./ui-policy.mjs";

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "polis-ui-policy-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, contents] of Object.entries(files)) {
    const filename = path.join(root, name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, contents);
  }
  return root;
}
const rules = (root) => checkUiPolicy(root).map((violation) => violation.rule);

test("rejects raw controls and animated action buttons outside the kit", (t) => {
  const root = fixture(t, {
    "src/features/example/view.tsx":
      "export const View = () => <><input /><button>Guardar</button><motion.button>Guardar</motion.button></>;",
  });
  assert.deepEqual(rules(root), ["UI001", "UI001", "UI001"]);
});
test("allows shared native controls and semantic animated cards", (t) => {
  const root = fixture(t, {
    "src/shared/ui/input.tsx": "export const Input = () => <input />;",
    "src/shared/design-system/catalog.ts":
      'export const componentCatalog = [{name:"input", source:"@/shared/ui/input", status:"ready"}];',
    "src/shared/ui/input.stories.tsx": 'import {Input} from "./input";',
    "src/features/example/view.tsx":
      'import {Input} from "@/shared/ui/input"; export const View = () => <motion.button className="ui-interactive-card"><Input /></motion.button>;',
  });
  assert.deepEqual(rules(root), []);
});
test("rejects forbidden dependencies through aliases, relative imports, exports and dynamic imports", (t) => {
  const root = fixture(t, {
    "src/shared/example.ts":
      'import "../features/store"; export * from "@/core/state"; const service = import("../app/page");',
    "src/core/example.ts": 'import "../features/store";',
    "src/features/example/view.tsx":
      'import * as R from "@radix-ui/react-dialog"; import {Dialog} from "../../shared/ui/dialog";',
  });
  assert.deepEqual(
    rules(root).sort(),
    ["UI002", "UI004", "UI004", "UI004", "UI004", "UI005"].sort(),
  );
});
test("rejects Prisma imports and reintroduced legacy-prisma files", (t) => {
  const root = fixture(t, {
    "src/features/example/store.ts":
      'import { PrismaClient } from "@prisma/client"; export const db = new PrismaClient();',
    "src/features/example/legacy.ts":
      'import db from "@/core/database/legacy-prisma"; export { db };',
    "src/core/database/legacy-prisma.ts": "export const db = {};",
  });
  assert.deepEqual(rules(root).sort(), ["UI009", "UI009", "UI009"]);
});
test("rejects Prisma dependencies and SQLite runtime commands", (t) => {
  const root = fixture(t, {
    "package.json": JSON.stringify({
      dependencies: { prisma: "^6.0.0" },
      scripts: { "db:push": "prisma db push --accept-data-loss" },
    }),
    ".zscripts/build.sh": "bun run db:push",
  });
  assert.deepEqual(rules(root).sort(), ["UI009", "UI009"]);
});
test("rejects literal palettes, arbitrary colors, CSS colors and colors inside templates", (t) => {
  const root = fixture(t, {
    "src/features/example/view.tsx":
      'const a = "bg-red-500"; const b = "bg-[#ff0000]"; const c = "rgb(255,0,0)"; const d = `text-white ${active}`;',
    "src/features/example/style.css": ".example { color: #ff0000; }",
    "src/shared/design-system/tokens.css":
      ":root { --ember: oklch(0.53 0.17 41); }",
  });
  assert.equal(rules(root).filter((rule) => rule === "UI003").length, 5);
});
test("allows semantic tokens and color selectors targeting vendor markup", (t) => {
  const root = fixture(t, {
    "src/shared/example.tsx":
      'const cls = "bg-ember text-text-primary [&_[stroke=\'#fff\']]:stroke-transparent"; const color = "var(--ember)";',
  });
  assert.deepEqual(rules(root), []);
});
test("requires inventory and story imports for new components", (t) => {
  const root = fixture(t, {
    "src/shared/ui/example.tsx": "export const Example = () => <div />;",
    "src/shared/design-system/catalog.ts":
      'export const componentCatalog = [{name:"example", source:"@/shared/ui/example", status:"ready"}];',
  });
  assert.deepEqual(rules(root), ["UI007"]);
  fs.writeFileSync(
    path.join(root, "src/shared/design-system/catalog.ts"),
    "export const componentCatalog = [];",
  );
  assert.deepEqual(rules(root), ["UI006"]);
});
test("rejects stale inventory entries and attempts to exempt a new component as legacy", (t) => {
  const root = fixture(t, {
    "src/shared/ui/example.tsx": "export const Example = () => <div />;",
    "src/shared/design-system/catalog.ts":
      'export const componentCatalog = [{name:"example", source:"@/shared/ui/example", status:"compatibility"}, {name:"missing", source:"@/shared/ui/missing", status:"ready"}];',
  });
  assert.deepEqual(rules(root), ["UI006", "UI007", "UI006"]);
});
test("rejects downgraded and disabled accessibility checks", (t) => {
  const root = fixture(t, {
    "src/shared/example.stories.tsx":
      'const a = {parameters:{a11y:{test:"todo"}}}; const b={a11y:{disable:true}}; const c={a11y:{config:{rules:[{id:"color-contrast",enabled:false}]}}}; const d={a11y:{test:"error"}};',
  });
  assert.deepEqual(rules(root), ["UI008", "UI008", "UI008"]);
});
