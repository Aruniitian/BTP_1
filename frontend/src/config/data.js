/**
 * Central data configuration for the AmoebaDB frontend.
 * Maps organism keys to display names, directories, and available data types.
 */

export const DATA_TYPES = {
  transcriptomics: { label: 'Annotated Transcripts', icon: 'FileText', color: 'blue' },
  protein:         { label: 'Annotated Proteins',    icon: 'Dna',      color: 'purple' },
  cds:             { label: 'Annotated CDS',         icon: 'Code',     color: 'green' },
  genome:          { label: 'Genome Sequences',      icon: 'Database', color: 'teal' },
  'codon-usage':   { label: 'Codon Usage',           icon: 'BarChart', color: 'amber' },
  'gene-aliases':  { label: 'Gene Aliases',          icon: 'Tags',     color: 'rose' },
  orf:             { label: 'ORF50 Predictions',     icon: 'Layers',   color: 'indigo' },
  'full-gff':      { label: 'Full GFF Annotations',  icon: 'List',     color: 'slate' },
  'curated-go':    { label: 'Curated GO (GAF)',      icon: 'BookOpen', color: 'emerald' },
  'go-gaf':        { label: 'GO Associations (GAF)', icon: 'BookOpen', color: 'lime' },
  'ncbi-linkout-nucleotide': { label: 'NCBI Linkout — Nucleotide', icon: 'ExternalLink', color: 'sky' },
  'ncbi-linkout-protein':    { label: 'NCBI Linkout — Protein',    icon: 'ExternalLink', color: 'cyan' },
};

export const ORGANISMS = {
  histolytica: {
    name: 'Entamoeba histolytica HM-1:IMSS',
    shortName: 'E. histolytica',
    dir: 'Entamoeba Histolytica',
    description: 'The causative agent of amoebic dysentery and liver abscess in humans. Third leading cause of parasitic disease mortality worldwide.',
    dataTypes: [
      'transcriptomics', 'protein', 'cds', 'genome',
      'codon-usage', 'gene-aliases', 'orf', 'full-gff',
      'curated-go', 'go-gaf', 'ncbi-linkout-nucleotide', 'ncbi-linkout-protein',
    ],
  },
  invadens: {
    name: 'Entamoeba invadens IP-1',
    shortName: 'E. invadens',
    dir: 'Entamoeba Invadens',
    description: 'A reptilian parasite used as a model organism for studying Entamoeba encystation.',
    dataTypes: [
      'transcriptomics', 'protein', 'cds', 'genome',
      'codon-usage', 'gene-aliases', 'full-gff',
    ],
  },
};

/**
 * Build the fetch URL for a given organism + dataType.
 * JSON files are served statically from /Data/<dir>/<file>.
 */
const FILE_MAP = {
  histolytica: {
    transcriptomics: 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedTranscripts.json',
    protein: 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json',
    cds: 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedCDSs.json',
    genome: 'AmoebaDB-68_EhistolyticaHM1IMSS_Genome.json',
    'codon-usage': 'AmoebaDB-68_EhistolyticaHM1IMSS_CodonUsage.json',
    'gene-aliases': 'AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json',
    orf: 'AmoebaDB-68_EhistolyticaHM1IMSS_Orf50.json',
    'full-gff': 'AmoebaDB-68_EhistolyticaHM1IMSS.json',
    'curated-go': 'AmoebaDB-68_EhistolyticaHM1IMSS_Curated_GO.gaf.json',
    'go-gaf': 'AmoebaDB-68_EhistolyticaHM1IMSS_GO.gaf.json',
    'ncbi-linkout-nucleotide': 'AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Nucleotide.json',
    'ncbi-linkout-protein': 'AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Protein.json',
  },
  invadens: {
    transcriptomics: 'EinvadensIP1_AnnotatedTranscripts.json',
    protein: 'EinvadensIP1_AnnotatedProteins.json',
    cds: 'EinvadensIP1_AnnotatedCDSs.json',
    genome: 'EinvadensIP1_Genome.json',
    'codon-usage': 'EinvadensIP1_CodonUsage.json',
    'gene-aliases': 'EinvadensIP1_GeneAliases.json',
    'full-gff': 'AmoebaDB-68_EinvadensIP1.json',
  },
};

export function getDataUrl(organism, dataType) {
  const org = ORGANISMS[organism];
  const file = FILE_MAP[organism]?.[dataType];
  if (!org || !file) return null;
  return `/Data/${encodeURIComponent(org.dir)}/${file}`;
}

/**
 * Normalize raw JSON data from AmoebaDB files into a flat array of records.
 */
export function normalizeData(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.records)) return raw.records;
  if (Array.isArray(raw.features)) return raw.features;
  if (Array.isArray(raw.data)) return raw.data;
  for (const key of Object.keys(raw)) {
    if (Array.isArray(raw[key])) return raw[key];
  }
  return [];
}

/**
 * Parse pipe-delimited AmoebaDB FASTA header metadata into key-value pairs.
 * Example: "gene=EHI_000010 | organism=Entamoeba_histolytica | ..."
 */
export function parseHeaderMetadata(headerText) {
  if (!headerText || typeof headerText !== 'string') return {};
  const meta = {};
  const parts = headerText.split('|');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const key = part.substring(0, eqIdx).trim();
      const val = part.substring(eqIdx + 1).trim();
      if (key && val) meta[key] = val;
    }
  }
  return meta;
}
