const fs = require('fs');
const files = [
  'c:/Users/Admin/Desktop/inventariofront/src/pages/BuscadorMaquinaPage.tsx',
  'c:/Users/Admin/Desktop/inventariofront/src/pages/DashboardProduccionPage.tsx',
  'c:/Users/Admin/Desktop/inventariofront/src/pages/HistorialRegistrosPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/<Grid item /g, '<Grid ');
  fs.writeFileSync(file, content);
}
console.log('Fixed Grid items');
