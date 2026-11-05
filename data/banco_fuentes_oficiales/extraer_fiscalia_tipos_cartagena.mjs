/** Extract reproducible Cartagena SPOA keyword counts from the public report. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = dirname(fileURLToPath(import.meta.url));
const URL = 'https://app.powerbi.com/view?r=eyJrIjoiMzEwN2ZiZTMtYTRlYS00ZTFkLWFlNGItMjljNDk1NmEzMGE2IiwidCI6Ijg3OWQ1YjhhLWM0NjctNDRmOS1hZGY0LTg3N2M2MWFkZGRjZSIsImMiOjR9';
const OUTPUT = join(ROOT, 'fiscalia_spoa_cartagena_busquedas_delito_2026.csv');
const MANIFEST = join(ROOT, 'fiscalia_spoa_cartagena_busquedas_delito_2026.manifest.json');
const TERMS = [
  ['homicidio', 'PERS'],
  ['feminicidio', 'COM'],
  ['lesiones', 'PERS'],
  ['hurto', 'PERS'],
  ['extorsion', 'PERS'],
  ['amenazas', 'PERS'],
  ['secuestro', 'PERS'],
  ['violencia intrafamiliar', 'COM'],
  ['acceso carnal', 'COM'],
  ['acto sexual', 'COM'],
  ['trata de personas', 'PERS'],
  ['estafa', 'ECON'],
  ['inasistencia alimentaria', 'SALUD'],
  ['estupefacientes', 'PERS'],
  ['armas de fuego', 'PERS'],
  ['desplazamiento forzado', 'SAT'],
  ['contaminacion ambiental', 'AMB'],
  ['corrupcion', 'POL'],
];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const count = async page => {
  const text = await page.locator('body').innerText();
  const value = text.match(/Procesos Registrados\s+([\d,]+)/)?.[1];
  return value ? Number(value.replaceAll(',', '')) : null;
};

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Procesos penales en Colombia', { exact: true }).waitFor({ timeout: 45000 });
  const intro = await page.locator('body').innerText();
  const cutoff = intro.match(/hasta el (\d{2}\/\d{2}\/\d{4})/i)?.[1];
  if (!cutoff) throw new Error('No se identificó el corte del tablero');
  await page.getByRole('button', { name: 'Next Page' }).click();
  await page.getByRole('heading', { name: 'Top 5 de lugares de hechos' }).waitFor();
  await page.getByRole('combobox', { name: 'Departamento' }).evaluate(element => element.click());
  await page.getByRole('option', { name: 'Bolívar' }).waitFor();
  await page.getByRole('option', { name: 'Bolívar' }).evaluate(element => element.click());
  await pause(800);
  const departmentCount = await count(page);
  await page.getByRole('combobox', { name: 'Municipio' }).evaluate(element => element.click());
  await page.getByRole('listbox', { name: 'Municipio' }).locator('.scroll-content').evaluate(element => {
    element.scrollTop = 190;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.getByRole('option', { name: 'Cartagena De Indias' }).waitFor();
  await page.getByRole('option', { name: 'Cartagena De Indias' }).evaluate(element => element.click());
  await page.mouse.click(980, 345);
  await page.waitForFunction(previous => {
    const text = document.body.innerText;
    const selected = text.match(/Procesos Registrados\s+([\d,]+)/)?.[1];
    return document.querySelector('[role="combobox"][aria-label="Municipio"]')?.textContent?.includes('Cartagena De Indias') &&
      selected && Number(selected.replaceAll(',', '')) !== previous;
  }, departmentCount, { timeout: 45000 });
  const baseline = await count(page);
  const search = page.getByRole('textbox', { name: 'Enter DELITO' });
  const rows = [];
  for (const [term, dimension] of TERMS) {
    await search.fill(term);
    await search.press('Enter');
    await page.getByRole('button', { name: `Remove ${term}` }).waitFor();
    await page.waitForFunction(previous => {
      const value = document.body.innerText.match(/Procesos Registrados\s+([\d,]+)/)?.[1];
      return value && Number(value.replaceAll(',', '')) !== previous;
    }, baseline, { timeout: 45000 });
    const value = await count(page);
    if (!Number.isInteger(value) || value < 0 || value > baseline) {
      throw new Error(`Conteo inválido para ${term}: ${value}`);
    }
    rows.push({ term, dimension, value });
    await page.getByRole('button', { name: `Remove ${term}` }).click();
    await page.waitForFunction(expected => /Procesos Registrados\s+([\d,]+)/.exec(document.body.innerText)?.[1]?.replaceAll(',', '') === String(expected), baseline, { timeout: 45000 });
    console.log(`${term}: ${value}`);
  }
  const csv = 'termino_busqueda,dimension_orientativa,procesos,porcentaje_total_no_exclusivo,corte,municipio_hecho,operador,estado\n' + rows.map(row =>
    `"${row.term}",${row.dimension},${row.value},${(row.value / baseline * 100).toFixed(2)},${cutoff},Cartagena de Indias,Contains any,consulta_textual_no_exhaustiva`
  ).join('\n') + '\n';
  writeFileSync(OUTPUT, csv, 'utf8');
  const metadata = {
    source_url: URL,
    source_owner: 'Fiscalía General de la Nación',
    source_system: 'SPOA',
    accessed_utc: new Date().toISOString(),
    cutoff,
    report_page: '¿Dónde ocurrieron los hechos? (2 de 7)',
    filters: { departamento: 'Bolívar', municipio_hecho: 'Cartagena De Indias', anio_hecho: 'All' },
    baseline_procesos: baseline,
    operator: 'Contains any',
    rows: rows.length,
    query_terms: TERMS.map(([term]) => term),
    interpretation: 'Cada cifra cuenta procesos cuyo delito coincide con la búsqueda textual. Las búsquedas pueden solaparse; no sumar filas ni tratarlas como categorías penales exhaustivas. La dimensión es una etiqueta orientativa, no clasificación oficial de Fiscalía.',
    limitations: 'El tablero no expone en esta vista una descarga exhaustiva de delito por municipio y año. Procesos registrados no equivalen a hechos ocurridos, personas víctimas ni condenas.',
    csv_sha256: createHash('sha256').update(csv).digest('hex'),
  };
  writeFileSync(MANIFEST, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  const catalogPath = join(ROOT, 'fiscalia_cartagena.manifest.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  catalog.tablero_powerbi.busquedas_delito_csv = 'fiscalia_spoa_cartagena_busquedas_delito_2026.csv';
  catalog.tablero_powerbi.busquedas_delito_manifest = 'fiscalia_spoa_cartagena_busquedas_delito_2026.manifest.json';
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
} finally {
  await browser.close();
}
