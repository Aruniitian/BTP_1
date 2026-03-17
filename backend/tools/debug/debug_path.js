const path = require('path');
const fs = require('fs');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const p = path.join(ROOT_DIR, 'public', 'Data', 'Entamoeba Histolytica', 'AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json');
console.log('path=', p);
console.log('exists=', fs.existsSync(p));
