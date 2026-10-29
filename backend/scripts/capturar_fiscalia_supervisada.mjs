/** Captura supervisada en carpeta nueva preparada por el corredor Python. */
import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = dirname(fileURLToPath(import.meta.url));
// Falla antes de abrir navegador/escribir si el corredor no preparó el insumo.
JSON.parse(readFileSync(join(ROOT, 'fiscalia_cartagena.manifest.json'), 'utf8'));
const URL = 'https://app.powerbi.com/view?r=eyJrIjoiMzEwN2ZiZTMtYTRlYS00ZTFkLWFlNGItMjljNDk1NmEzMGE2IiwidCI6Ijg3OWQ1YjhhLWM0NjctNDRmOS1hZGY0LTg3N2M2MWFkZGRjZSIsImMiOjR9';
const CSV = join(ROOT, 'fiscalia_spoa_cartagena_procesos_por_anio.csv');
const TOP5_CSV = join(ROOT, 'fiscalia_spoa_top5_municipios.csv');
const MANIFEST = join(ROOT, 'fiscalia_powerbi_cartagena.manifest.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const csvField = value => `"${String(value).replaceAll('"', '""')}"`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Procesos penales en Colombia', { exact: true }).waitFor({ timeout: 45000 });
  const sourceText = await page.locator('body').innerText();
  const cutoff = sourceText.match(/hasta el (\d{2}\/\d{2}\/\d{4})/i)?.[1];
  if (!cutoff) throw new Error('No se encontró el corte del tablero');

  await page.getByRole('button', { name: 'Next Page' }).click();
  await page.getByRole('heading', { name: 'Top 5 de lugares de hechos' }).waitFor();
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return [...text.matchAll(/Select Row\n[^\n]+\n[^\n]+\n[\d,]+\nAdditional Conditional Formatting/g)].length === 5;
  }, undefined, { timeout: 45000 });
  const locationText = await page.locator('body').innerText();
  if (!locationText.includes('Departamento\nAll\nMunicipio\nAll')) {
    throw new Error('El Top 5 no tiene filtros generales');
  }
  const rankingStart = locationText.indexOf('Top 5 de lugares de hechos');
  const rankingEnd = locationText.indexOf('Procesos Registrados', rankingStart);
  const rankingText = locationText.slice(rankingStart, rankingEnd);
  const top5 = [...rankingText.matchAll(/Select Row\n([^\n]+)\n([^\n]+)\n([\d,]+)\nAdditional Conditional Formatting/g)]
    .map((match, index) => ({ rank: index + 1, department: match[1], municipality: match[2], count: Number(match[3].replaceAll(',', '')) }));
  if (top5.length !== 5 || top5.some((row, index) => index > 0 && row.count > top5[index - 1].count)) {
    throw new Error('No se pudo leer completo el Top 5 de municipios');
  }
  await page.getByRole('button', { name: 'Next Page' }).click();
  await sleep(1500);
  await page.getByRole('combobox', { name: 'Departamento' }).evaluate(element => element.click());
  await page.getByRole('option', { name: 'Bolívar' }).waitFor();
  await page.getByRole('option', { name: 'Bolívar' }).evaluate(element => element.click());
  await sleep(1500);
  await page.getByRole('combobox', { name: 'Municipio' }).evaluate(element => element.click());
  const list = page.getByRole('listbox', { name: 'Municipio' });
  await list.locator('.scroll-content').evaluate(element => {
    element.scrollTop = 190;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.getByRole('option', { name: 'Cartagena De Indias' }).waitFor();
  const departmentChartPath = await page.locator('path.line').getAttribute('d');
  await page.getByRole('option', { name: 'Cartagena De Indias' }).evaluate(element => element.click());
  await page.mouse.click(980, 345);
  await page.waitForFunction(previousPath => {
    const body = document.body.innerText;
    const selected = body.match(/Número de Procesos\s+seleccionados\s+([\d,]+)/)?.[1];
    const municipality = document.querySelector('[role="combobox"][aria-label="Municipio"]');
    const chartPath = document.querySelector('path.line')?.getAttribute('d');
    return municipality?.textContent?.includes('Cartagena De Indias') &&
      chartPath && chartPath !== previousPath && selected;
  }, departmentChartPath, { timeout: 45000 });

  const text = await page.locator('body').innerText();
  const total = Number(text.match(/Número de Procesos\s+seleccionados\s+([\d,]+)/)?.[1]?.replaceAll(',', ''));
  if (!Number.isInteger(total) || total < 1) throw new Error('No se encontró el total municipal');

  const point = page.locator('circle.focus-element');
  await point.focus();
  const rows = [];
  const pointCount = Number(await point.getAttribute('aria-setsize'));
  if (!Number.isInteger(pointCount) || pointCount < 1 || pointCount > 250) {
    throw new Error('Cantidad de puntos de la serie no válida');
  }
  for (let index = 0; index < pointCount; index++) {
    const label = await point.getAttribute('aria-label');
    const match = label?.match(/FECHA Año (\d{4})\. Nro\. de Procesos ([\d,]+)\./);
    if (!match) throw new Error(`Punto sin etiqueta válida: ${label}`);
    rows.push({ year: Number(match[1]), count: Number(match[2].replaceAll(',', '')) });
    await page.keyboard.press('ArrowRight');
    await sleep(50);
  }
  if (new Set(rows.map(row => row.year)).size !== pointCount ||
      rows.some((row, i) => !Number.isSafeInteger(row.count) || row.count < 0 ||
        row.year < 1900 || row.year > 2200 || (i > 0 && row.year <= rows[i - 1].year))) {
    throw new Error('La serie anual está incompleta o desordenada');
  }
  const csv = 'fuente,municipio_hecho,anio_hecho,procesos,corte,estado\n' + rows.map(row =>
    `Fiscalia_SPOA_PowerBI,Cartagena de Indias,${row.year},${row.count},${cutoff},${row.year === Number(cutoff.split('/')[2]) && !cutoff.startsWith('31/12/') ? 'anio_parcial' : 'tablero_publico'}`
  ).join('\n') + '\n';
  writeFileSync(CSV, csv, 'utf8');
  const annualSum = rows.reduce((sum, row) => sum + row.count, 0);
  const cartagenaRanking = top5.find(row => row.municipality === 'Cartagena De Indias');
  if (cartagenaRanking?.count !== total) throw new Error('El Top 5 no coincide con el total municipal de la serie');
  const top5Csv = 'posicion,departamento,municipio_hecho,procesos,corte,fuente\n' + top5.map(row =>
    `${row.rank},${csvField(row.department)},${csvField(row.municipality)},${row.count},${cutoff},Fiscalia_SPOA_PowerBI`
  ).join('\n') + '\n';
  writeFileSync(TOP5_CSV, top5Csv, 'utf8');
  const metadata = {
    source_url: URL,
    source_system: 'SPOA',
    source_owner: 'Fiscalía General de la Nación',
    accessed_utc: new Date().toISOString(),
    cutoff,
    filters: { departamento: 'Bolívar', municipio_hecho: 'Cartagena De Indias' },
    report_page: '¿Cuándo ocurrieron los hechos? (3 de 7)',
    year_variable: 'año del hecho',
    total_procesos_municipio: total,
    annual_rows: rows.length,
    annual_sum: annualSum,
    total_minus_annual_sum: total - annualSum,
    annual_sum_warning: 'El total del tablero no coincide con la suma de los años visibles; no asignar el residuo a un año ni inferir su causa sin ficha del modelo.',
    interpretation: 'Procesos penales registrados por presuntos delitos; no equivalen a hechos ocurridos, personas víctimas ni condenas. Las cifras pueden cambiar con actualizaciones del SPOA.',
    csv_sha256: createHash('sha256').update(csv).digest('hex'),
    top5: {
      report_page: '¿Dónde ocurrieron los hechos? (2 de 7)',
      filters: { departamento: 'All', municipio: 'All', delito: 'sin filtro' },
      csv: 'fiscalia_spoa_top5_municipios.csv',
      rows: top5.length,
      csv_sha256: createHash('sha256').update(top5Csv).digest('hex'),
      interpretation: 'Municipios con más procesos acumulados en SPOA; no son tasas ajustadas por población ni una clasificación de riesgo.',
    },
  };
  writeFileSync(MANIFEST, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  const catalog = join(ROOT, 'fiscalia_cartagena.manifest.json');
  const existing = JSON.parse(readFileSync(catalog, 'utf8'));
  existing.estado = 'extraccion_parcial_powerbi_procesos';
  existing.filas_cartagena_descargadas = rows.length;
  existing.tablero_powerbi = { url: URL, csv: 'fiscalia_spoa_cartagena_procesos_por_anio.csv', top5_csv: 'fiscalia_spoa_top5_municipios.csv', manifest: 'fiscalia_powerbi_cartagena.manifest.json' };
  writeFileSync(catalog, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ rows: rows.length, total, annualSum, difference: total - annualSum, cutoff }));
} finally {
  await browser.close();
}
