const path = require('path');
const fs = require('fs');
const p = path.join(__dirname, 'public', 'Data', 'Entamoeba Histolytica', 'AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json');
console.log('path=', p);
console.log('exists=', fs.existsSync(p));
