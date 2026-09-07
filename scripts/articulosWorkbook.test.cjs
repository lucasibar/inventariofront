const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const XLSX = require('xlsx');

const filename = path.resolve('src/features/quality/articulos/articulosWorkbook.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { exportMaterialColumns, readArticleWorkbook } = compiled.exports;
const aliases = { codigo: 'codigo', descripcion: 'descripcion', colordetalle: 'colorDetalle' };

function workbook(rows) {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Artículos');
    return XLSX.read(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
}
function exportedRows() {
    return exportMaterialColumns(articles).rows.map(row => ({ Código: 'ART-01', Descripción: 'Media', 'Color detalle': 'Rojo', ...row }));
}
const articles = [{ codigo: 'ART-01', itemRefs: [
    ...['Blanco', 'Negro', 'Rojo', 'Azul'].flatMap((color, index) => [1, 2].map((option) => ({
        rol: 'COLOR_BASE', grupo: index + 1, colorNombre: color, orden: option,
        item: { codigoInterno: `00${index}${option}` }, esPreferenciaActual: option === 2, activo: true,
        consumoGramos: '1.250', desperdicio: '3.50', conosPreparacion: 0,
    }))),
    { rol: 'GOMA', grupo: 1, colorNombre: 'Negra', orden: 1, item: { codigoInterno: 'G01' }, esPreferenciaActual: true, activo: true },
    { rol: 'GOMA', grupo: 1, colorNombre: 'Negra', orden: 2, item: { codigoInterno: 'G02' }, esPreferenciaActual: false, activo: false },
] }];

test('XLSX round trip keeps four base colors, alternatives, preferences and inactive rubber', () => {
    const [row] = readArticleWorkbook(workbook(exportedRows()), aliases);
    assert.equal(row.colorDetalle, 'Rojo');
    assert.equal(row.itemRefsByCode.length, 10);
    const refs = row.itemRefsByCode.filter((r) => r.rol === 'COLOR_BASE');
    assert.equal(new Set(refs.map((r) => r.grupo)).size, 4);
    assert.equal(refs.filter((r) => r.esPreferenciaActual).length, 4);
    assert.equal(refs[0].itemCode, '0001');
    assert.equal(refs[0].consumoGramos, '1.250');
    assert.equal(refs[0].conosPreparacion, 0);
    assert.equal(row.itemRefsByCode.at(-1).activo, false);
});
test('invalid preferences and activity cannot silently change the selection', () => {
    const rows = exportedRows();
    assert.throws(() => readArticleWorkbook(workbook([{ ...rows[0], 'Base 1 / En uso': 9 }]), aliases), /alternativa cargada/);
    assert.throws(() => readArticleWorkbook(workbook([{ ...rows[0], 'Base 1 / Alternativa 1 / Activo': 'Quizás' }]), aliases), /Sí o No/);
});
test('compact columns map each color independently and choose first active alternative', () => {
    const [row] = readArticleWorkbook(workbook([{ Código: 'ART-01', Descripción: 'Media',
        'base1/alternativa1': '001', 'base1/alternativa2': '002',
        'base2/alternativa1': '003', 'base2/alternativa2': '004',
        'Goma 1 / Alternativa 1': 'G01',
    }]), aliases);
    assert.deepEqual(row.itemRefsByCode.map(r => [r.grupo, r.orden, r.esPreferenciaActual]), [
        [1, 1, true], [1, 2, false], [2, 1, true], [2, 2, false], [1, 1, true],
    ]);
});
test('export includes extra groups and alternatives beyond the default template', () => {
    const extra = [{ codigo: 'ART-01', itemRefs: [...articles[0].itemRefs, {
        rol: 'COLOR_BASE', grupo: 5, orden: 7, item: { codigoInterno: 'EXTRA' }, activo: true, esPreferenciaActual: true,
    }] }];
    const { headers, rows } = exportMaterialColumns(extra);
    assert.ok(headers.includes('Base 5 / Alternativa 7'));
    const [row] = readArticleWorkbook(workbook([{ Código: 'ART-01', Descripción: 'Media', ...rows[0] }]), aliases);
    assert.ok(row.itemRefsByCode.some(r => r.grupo === 5 && r.orden === 7 && r.itemCode === 'EXTRA'));
});
test('ambiguous legacy headers and duplicate columns are rejected', () => {
    assert.throws(() => readArticleWorkbook(workbook([{ Código: 'ART-01', 'Base 1': '0001' }]), aliases), /formato anterior/);
    assert.throws(() => readArticleWorkbook(workbook([{ Código: 'ART-01', 'Base 1 / Alternativa 1': '01', 'base1/alternativa1': '02' }]), aliases), /repetidos/);
    const [empty] = readArticleWorkbook(workbook([{ Código: 'ART-01', 'Base 1 / Alternativa 1': '' }]), aliases);
    assert.deepEqual(empty.itemRefsByCode, []);
});
