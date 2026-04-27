const fs = require('fs');

let f1 = 'c:/Users/Admin/Desktop/inventariofront/src/pages/DashboardProduccionPage.tsx';
let c1 = fs.readFileSync(f1, 'utf-8');
c1 = c1.replace(/import React, \{/g, 'import {');
c1 = c1.replace(/PageHeader, /, '');
fs.writeFileSync(f1, c1);

let f2 = 'c:/Users/Admin/Desktop/inventariofront/src/pages/HistorialRegistrosPage.tsx';
let c2 = fs.readFileSync(f2, 'utf-8');
c2 = c2.replace(/import React, \{/g, 'import {');
fs.writeFileSync(f2, c2);

console.log('Fixed React imports');
