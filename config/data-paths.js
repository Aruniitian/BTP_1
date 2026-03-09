// =============================================================================
// config/data-paths.js — Single source of truth for organism/dataType mappings
// Fix #7: Eliminates duplicate data-path mappings across server + client code.
// =============================================================================

const path = require('path');

/**
 * Central registry of all data files by organism and data type.
 * Both server-side file resolution and client-side endpoint generation
 * derive from this single configuration object.
 */
const DATA_FILES = {
    histolytica: {
        dir: 'Entamoeba Histolytica',
        files: {
            'transcriptomics': 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedTranscripts.json',
            'protein':         'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json',
            'cds':             'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedCDSs.json',
            'genome':          'AmoebaDB-68_EhistolyticaHM1IMSS_Genome.json',
            'codon-usage':     'AmoebaDB-68_EhistolyticaHM1IMSS_CodonUsage.json',
            'orf':             'AmoebaDB-68_EhistolyticaHM1IMSS_Orf50.json',
            'orf50':           'AmoebaDB-68_EhistolyticaHM1IMSS_Orf50.json',
            'gene-aliases':    'AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json',
            'curated-go':      'AmoebaDB-68_EhistolyticaHM1IMSS_Curated_GO.gaf.json',
            'go-gaf':          'AmoebaDB-68_EhistolyticaHM1IMSS_GO.gaf.json',
            'ncbi-linkout-nucleotide': 'AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Nucleotide.json',
            'ncbi-linkout-protein':    'AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Protein.json',
            'full-gff':        'AmoebaDB-68_EhistolyticaHM1IMSS.json'
        }
    },
    invadens: {
        dir: 'Entamoeba Invadens',
        files: {
            'transcriptomics': 'EinvadensIP1_AnnotatedTranscripts.json',
            'protein':         'EinvadensIP1_AnnotatedProteins.json',
            'cds':             'EinvadensIP1_AnnotatedCDSs.json',
            'genome':          'EinvadensIP1_Genome.json',
            'codon-usage':     'EinvadensIP1_CodonUsage.json',
            'gene-aliases':    'EinvadensIP1_GeneAliases.json',
            'full-gff':        'AmoebaDB-68_EinvadensIP1.json'
        }
    }
};

// Pre-computed validation sets
const VALID_ORGANISMS = Object.keys(DATA_FILES);
const VALID_DATA_TYPES = new Set();
for (const org of Object.values(DATA_FILES)) {
    for (const dt of Object.keys(org.files)) {
        VALID_DATA_TYPES.add(dt);
    }
}

/**
 * Resolve the absolute file path for a given organism + dataType.
 * @param {string} baseDir - Project root directory (__dirname of server.js)
 * @param {string} organism - 'histolytica' or 'invadens'
 * @param {string} dataType - e.g. 'protein', 'transcriptomics', 'cds', etc.
 * @returns {string|null} Absolute file path, or null if mapping not found.
 */
function getDataFilePath(baseDir, organism, dataType) {
    const orgConfig = DATA_FILES[organism];
    if (!orgConfig) return null;
    const fileName = orgConfig.files[dataType];
    if (!fileName) return null;
    return path.join(baseDir, 'public', 'Data', orgConfig.dir, fileName);
}

/**
 * Get the public URL endpoint for a given organism + dataType.
 * Useful for client-side fetch calls.
 * @param {string} organism
 * @param {string} dataType
 * @returns {string|null}
 */
function getDataEndpoint(organism, dataType) {
    const orgConfig = DATA_FILES[organism];
    if (!orgConfig) return null;
    const fileName = orgConfig.files[dataType];
    if (!fileName) return null;
    return `Data/${encodeURIComponent(orgConfig.dir)}/${fileName}`;
}

module.exports = {
    DATA_FILES,
    getDataFilePath,
    getDataEndpoint,
    VALID_ORGANISMS,
    VALID_DATA_TYPES
};
