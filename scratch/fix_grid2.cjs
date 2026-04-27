const fs = require('fs');
const files = [
  'c:/Users/Admin/Desktop/inventariofront/src/pages/BuscadorMaquinaPage.tsx',
  'c:/Users/Admin/Desktop/inventariofront/src/pages/DashboardProduccionPage.tsx',
  'c:/Users/Admin/Desktop/inventariofront/src/pages/HistorialRegistrosPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Also remove unused imports from RegistroMaquinasPage
  if (file.includes('RegistroMaquinasPage')) {
     content = content.replace(/import React[^;]+;/, "import { useState, useEffect, useMemo } from 'react';");
     content = content.replace(/Paper, /, "");
  }

  // <Grid xs={12} md={4}> -> <Grid size={{xs: 12, md: 4}}>
  content = content.replace(/<Grid\s+(xs=\{[^}]+\})?\s*(sm=\{[^}]+\})?\s*(md=\{[^}]+\})?\s*(lg=\{[^}]+\})?/g, (match, xs, sm, md, lg) => {
    if (!xs && !sm && !md && !lg) return match;
    const parts = [];
    if (xs) parts.push(`xs: ${xs.match(/\{([^}]+)\}/)[1]}`);
    if (sm) parts.push(`sm: ${sm.match(/\{([^}]+)\}/)[1]}`);
    if (md) parts.push(`md: ${md.match(/\{([^}]+)\}/)[1]}`);
    if (lg) parts.push(`lg: ${lg.match(/\{([^}]+)\}/)[1]}`);
    return `<Grid size={{ ${parts.join(', ')} }}`;
  });

  fs.writeFileSync(file, content);
}

// Fix RegistroMaquinasPage unused imports separately
let regFile = 'c:/Users/Admin/Desktop/inventariofront/src/pages/RegistroMaquinasPage.tsx';
let regContent = fs.readFileSync(regFile, 'utf-8');
regContent = regContent.replace(/import React, \{/g, "import {");
regContent = regContent.replace(/Paper, /g, "");
fs.writeFileSync(regFile, regContent);

console.log('Fixed Grid sizes');
