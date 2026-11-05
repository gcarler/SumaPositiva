/** Extract annual Cartagena process counts for the previously catalogued SPOA queries. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = dirname(fileURLToPath(import.meta.url));
const URL = 'https://app.powerbi.com/view?r=eyJrIjoiMzEwN2ZiZTMtYTRlYS00ZTFkLWFlNGItMjljNDk1NmEzMGE2IiwidCI6Ijg3OWQ1YjhhLWM0NjctNDRmOS1hZGY0LTg3N2M2MWFkZGRjZSIsImMiOjR9';
const OUTPUT = join(ROOT, 'fiscalia_spoa_cartagena_delitos_por_anio_2026.csv');
const MANIFEST = join(ROOT, 'fiscalia_spoa_cartagena_delitos_por_anio_2026.manifest.json');
const sourceCsv = readFileSync(join(ROOT, 'fiscalia_spoa_cartagena_busquedas_delito_2026.csv'), 'utf8');
const sourceRows = sourceCsv.trim().split('\n').slice(1).map(line => {
  const match = line.match(/^"([^"]+)",([^,]+),(\d+),/);
  if (!match) throw new Error(`Fila de catálogo no reconocida: ${line}`);
  return { term: match[1], dimension: match[2], total: Number(match[3]) };
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const count = async page => {
  const value = (await page.locator('body').innerText()).match(/Número de Procesos\s+seleccionados\s+([\d,]+)/)?.[1];
  return value ? Number(value.replaceAll(',', '')) : null;
};

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Procesos penales en Colombia', { exact: true }).waitFor({ timeout: 45000 });
  const intro = await page.locator('body').innerText();
  const cutoff = intro.match(/hasta el (\d{2}\/\d{2}\/\d{4})/i)?.[1];
  if (!cutoff) throw new Error('No se encontró el corte del tablero');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Next Page' }).click();
    await pause(800);
  }
  await page.getByRole('combobox', { name: 'Departamento' }).evaluate(element => element.click());
  await page.getByRole('option', { name: 'Bolívar' }).waitFor();
  await page.getByRole('option', { name: 'Bolívar' }).evaluate(element => element.click());
  await pause(800);
  await page.getByRole('combobox', { name: 'Municipio' }).evaluate(element => element.click());
  await page.getByRole('listbox', { name: 'Municipio' }).locator('.scroll-content').evaluate(element => {
    element.scrollTop = 190;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.getByRole('option', { name: 'Cartagena De Indias' }).waitFor();
  await page.getByRole('option', { name: 'Cartagena De Indias' }).evaluate(element => element.click());
  await page.mouse.click(980, 345);
  await page.waitForFunction(() => {
    const selected = document.body.innerText.match(/Número de Procesos\s+seleccionados\s+([\d,]+)/)?.[1];
    return document.querySelector('[role="combobox"][aria-label="Municipio"]')?.textContent?.includes('Cartagena De Indias') &&
      selected && Number(selected.replaceAll(',', '')) < 700000;
  }, undefined, { timeout: 45000 });
  const baseline = await count(page);
  const search = page.getByRole('textbox', { name: 'Enter DELITO' });
  const matrix = [];
  const reconciliation = [];
  for (const source of sourceRows) {
    const pathBeforeTerm = await page.locator('path.line').getAttribute('d');
    await search.fill(source.term);
    await search.press('Enter');
    await page.waitForFunction(({ expected, previousPath }) => {
      const selected = document.body.innerText.match(/Número de Procesos\s+seleccionados\s+([\d,]+)/)?.[1];
      return selected && Number(selected.replaceAll(',', '')) === expected &&
        document.querySelector('path.line')?.getAttribute('d') !== previousPath;
    }, { expected: source.total, previousPath: pathBeforeTerm }, { timeout: 45000 });
    await pause(600);
    const point = page.locator('circle.focus-element');
    await point.focus();
    const pointCount = Number(await point.getAttribute('aria-setsize'));
    if (!Number.isInteger(pointCount) || pointCount < 1 || pointCount > 23) {
      throw new Error(`Número de puntos inválido para ${source.term}: ${pointCount}`);
    }
    const yearMap = new Map();
    for (let i = 0; i < pointCount; i++) {
      const label = await point.getAttribute('aria-label');
      const match = label?.match(/FECHA Año (\d{4})\. Nro\. de Procesos ([\d,]+)\./);
      if (!match) throw new Error(`Punto anual no reconocido para ${source.term}: ${label}`);
      const year = Number(match[1]);
      if (yearMap.has(year)) throw new Error(`Año duplicado en ${source.term}: ${year}`);
      yearMap.set(year, Number(match[2].replaceAll(',', '')));
      if (i < pointCount - 1) {
        await point.press('ArrowRight');
        await page.waitForFunction(previous =>
          document.querySelector('circle.focus-element')?.getAttribute('aria-label') !== previous,
        label, { timeout: 5000 });
      }
    }
    for (let year = 2004; year <= 2026; year++) {
      matrix.push({ ...source, year, value: yearMap.get(year) ?? null });
    }
    const annualSum = [...yearMap.values()].reduce((sum, value) => sum + value, 0);
    reconciliation.push({ term: source.term, cumulative: source.total, annual_sum: annualSum,
      unexplained_difference: source.total - annualSum, years_displayed: pointCount,
      years_not_displayed: [...Array(23).keys()].map(i => 2004 + i).filter(year => !yearMap.has(year)) });
    console.log(`${source.term}: ${pointCount} años, suma ${annualSum}, residuo ${source.total - annualSum}`);
    const filteredPath = await page.locator('path.line').getAttribute('d');
    await page.getByRole('button', { name: `Remove ${source.term}` }).click();
    await page.waitForFunction(({ expected, previousPath }) => {
      const selected = document.body.innerText.match(/Número de Procesos\s+seleccionados\s+([\d,]+)/)?.[1];
      return selected && Number(selected.replaceAll(',', '')) === expected &&
        document.querySelector('path.line')?.getAttribute('d') !== previousPath;
    }, { expected: baseline, previousPath: filteredPath }, { timeout: 45000 });
    await pause(600);
  }
  const csv = 'termino_busqueda,dimension_orientativa,anio_hecho,procesos,corte,estado\n' + matrix.map(row =>
    `"${row.term}",${row.dimension},${row.year},${row.value ?? ''},${cutoff},${row.value === null ? 'anio_no_mostrado' : row.year === 2026 ? 'anio_parcial' : 'punto_del_grafico'}`
  ).join('\n') + '\n';
  writeFileSync(OUTPUT, csv, 'utf8');
  const metadata = {
    source_url: URL,
    source_system: 'SPOA',
    source_owner: 'Fiscalía General de la Nación',
    accessed_utc: new Date().toISOString(),
    cutoff,
    report_page: '¿Cuándo ocurrieron los hechos? (3 de 7)',
    filters: { departamento: 'Bolívar', municipio_hecho: 'Cartagena De Indias', anio_hecho: 'All' },
    query_operator: 'Contains any',
    baseline_procesos: baseline,
    terms: sourceRows.length,
    rows: matrix.length,
    observed_year_points: matrix.filter(row => row.value !== null).length,
    reconciliation,
    interpretation: 'Series de procesos por año del hecho para búsquedas textuales de delito. Los términos pueden solaparse; no sumar entre términos. Un año no mostrado queda vacío, no se presume cero.',
    caveat: '2026 tiene corte al 30 de septiembre. Los procesos registrados no equivalen a hechos ocurridos, víctimas ni condenas. Las diferencias entre total filtrado y suma anual no se imputan a ningún año.',
    csv_sha256: createHash('sha256').update(csv).digest('hex'),
  };
  writeFileSync(MANIFEST, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  const catalogPath = join(ROOT, 'fiscalia_cartagena.manifest.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  catalog.tablero_powerbi.delitos_por_anio_csv = 'fiscalia_spoa_cartagena_delitos_por_anio_2026.csv';
  catalog.tablero_powerbi.delitos_por_anio_manifest = 'fiscalia_spoa_cartagena_delitos_por_anio_2026.manifest.json';
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
} finally {
  await browser.close();
}
