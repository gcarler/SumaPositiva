import { Children, isValidElement, type ReactNode } from "react";
import { expect, test } from "vitest";

import IndicadoresPage from "./page";

test("la página declara una región principal y mantiene el pie fuera de ella", () => {
  const pagina = IndicadoresPage();
  const hijos = Children.toArray(pagina.props.children);
  const principales = hijos.filter(
    (hijo) => isValidElement(hijo) && hijo.type === "main",
  );

  expect(principales).toHaveLength(1);
  const principal = principales[0];
  if (!isValidElement<{ children: ReactNode }>(principal)) {
    throw new Error("Falta la región principal de la página");
  }
  expect(Children.count(principal.props.children)).toBe(1);
  expect(hijos).toHaveLength(2);
  expect(hijos.indexOf(principal)).toBe(0);
});
