// Global variables to store current data for searching
let currentTranscriptData = [];
let currentProteinData = [];
let currentGeneData = [];
let currentGenomeData = [];
let currentCDSData = [];
let currentCodonUsageData = [];
let currentGeneAliasesData = [];
let currentFullGFFData = [];
let currentORFData = [];
let currentDataType = '';
let currentActiveButton = null;
// Helper: parse AmoebaDB-style header string into a map of key=>value.
// Example header parts: "... | sequence_SO=supercontig | SO=protein_coding_gene | ..."
function parseHeaderMetadata(header) {
    const map = {};
    if (!header || typeof header !== 'string') return map;
    // split on pipe separators
    const parts = header.split('|').map(p => p.trim());
    parts.forEach(part => {
        const eq = part.indexOf('=');
        if (eq > 0) {
            const key = part.slice(0, eq).trim();
            const val = part.slice(eq + 1).trim();
            if (key) map[key] = val;
        }
    });
    return map;
}
// Keep a copy of the initial home HTML so back navigation can restore it exactly
let initialOverviewHTML = '';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the main organism list toggle
    const organismsToggle = document.getElementById('organisms-toggle');
    const organismsList = document.getElementById('organisms-list');

    // Make the top-level organisms list visible by default and keep the
    // heading styled (blue) but remove its toggle/collapse behavior.
    // Sub-list toggles (for Histolytica / Invadens) are left unchanged.
    if (organismsToggle && organismsList) {
        // Ensure visible on load
        organismsList.classList.remove('hidden');
        organismsList.classList.add('visible');
        // Keep the heading styled as active (blue) so it looks the same
        organismsToggle.classList.add('active');
        // Do NOT attach a click listener here - the top-level heading
        // should not collapse the list. Sublist toggles still work below.
    }

    // Get all sub-list toggles
    const sublistToggles = document.querySelectorAll('.sublist-toggle');

    // Add a click event listener to each sub-list toggle
    sublistToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const targetList = document.getElementById(targetId);
            
            if (targetList) {
                targetList.classList.toggle('hidden');
                targetList.classList.toggle('visible');
                toggle.classList.toggle('active');
            }
        });
    });

    // Get all organism links
    const organismLinks = document.querySelectorAll('.organism-link');
    console.log('Found organism links:', organismLinks.length);

    // Add click event listeners to organism links
    organismLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            
            const linkText = link.textContent.trim();
            const dataOrganism = link.getAttribute('data-organism');
            console.log('Clicked link text:', linkText);
            console.log('Data organism:', dataOrganism);
            
            // Remove active class from previously active button
            if (currentActiveButton) {
                currentActiveButton.classList.remove('active');
            }
            
            // Add active class to current button
            const sidebarItem = link.closest('.sidebar-item');
            if (sidebarItem) {
                sidebarItem.classList.add('active');
                currentActiveButton = sidebarItem;
            }
            
            // Show back button
            document.getElementById('backButtonContainer').style.display = 'block';
            // hide homepage gallery while navigating into dataset views
            hideHomeGallery();
            
            // Load data for both Entamoeba Histolytica and Entamoeba Invadens
            if (dataOrganism && dataOrganism.includes('Entamoeba Histolytica')) {
                if (linkText.toLowerCase() === 'transcripts') {
                    console.log('Loading transcriptomics data...');
                    await loadData('transcriptomics', 'histolytica');
                } else if (linkText === 'Protein Sequence') {
                    console.log('Loading protein data...');
                    await loadData('protein', 'histolytica');
                } else if (linkText === 'CDS') {
                    console.log('Loading CDS data...');
                    await loadData('cds', 'histolytica');
                } else if (linkText === 'Codon usage' || linkText === 'Codon Usage') {
                    console.log('Loading codon usage data...');
                    await loadData('codon-usage', 'histolytica');
                } else if (linkText === 'ORF') {
                    console.log('Loading ORF data...');
                    await loadData('orf', 'histolytica');
                } else if (linkText === 'Full GFF') {
                    console.log('Loading Full GFF data...');
                    await loadData('full-gff', 'histolytica');
                } else if (linkText === 'Genome') {
                    console.log('Loading genome data...');
                    await loadData('genome', 'histolytica');
                } else if (linkText.toLowerCase() === 'gene aliases' || linkText.toLowerCase() === 'gene alias') {
                    console.log('Loading Entamoeba Histolytica gene aliases data...');
                    await loadData('gene-aliases', 'histolytica');
                }
            } else if (dataOrganism && dataOrganism.includes('Entamoeba Invadens')) {
                if (linkText.toLowerCase() === 'transcripts') {
                    console.log('Loading Entamoeba Invadens transcriptomics data...');
                    await loadData('transcriptomics', 'invadens');
                } else if (linkText === 'Protein Sequence') {
                    console.log('Loading Entamoeba Invadens protein data...');
                    await loadData('protein', 'invadens');
                } else if (linkText === 'CDS') {
                    console.log('Loading Entamoeba Invadens CDS data...');
                    await loadData('cds', 'invadens');
                } else if (linkText === 'Genome') {
                    console.log('Loading Entamoeba Invadens genome data...');
                    await loadData('genome', 'invadens');
                } else if (linkText === 'Codon usage') {
                    console.log('Loading Entamoeba Invadens codon usage data...');
                    await loadData('codon-usage', 'invadens');
                } else if (linkText === 'Gene aliases') {
                    console.log('Loading Entamoeba Invadens gene aliases data...');
                    await loadData('gene-aliases', 'invadens');
                } else if (linkText === 'Full GFF') {
                    console.log('Loading Entamoeba Invadens Full GFF data...');
                    await loadData('full-gff', 'invadens');
                } else if (linkText === 'ORF') {
                    console.log('Loading Entamoeba Invadens ORF data...');
                    await loadData('orf', 'invadens');
                }
            } else {
                console.log('Unknown organism or link:', dataOrganism, linkText);
            }
        });
    });

    // Add event listeners for all search types
    setupSearchListeners('transcript', performTranscriptSearch);
    setupSearchListeners('protein', performProteinSearch);
    setupSearchListeners('gene', performGeneSearch);
    setupSearchListeners('genome', performGenomeSearch);
    setupSearchListeners('cds', performCDSSearch);
    setupSearchListeners('codonUsage', performCodonUsageSearch);
    setupSearchListeners('geneAliases', performGeneAliasesSearch);
    setupSearchListeners('fullGFF', performFullGFFSearch);
    setupSearchListeners('orf', performORFSearch);

    // Global navbar search (search any ID across datasets)
    const globalSearchBtn = document.getElementById('globalSearchBtn');
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchBtn) {
        globalSearchBtn.addEventListener('click', performGlobalSearch);
    }
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') performGlobalSearch();
        });
    }
    
    // Add back button functionality
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', goBackToHome);
    }

    // Save the initial results container HTML so we can restore it later
    const initialResultsEl = document.getElementById('resultsContainer');
    if (initialResultsEl) {
        initialOverviewHTML = initialResultsEl.innerHTML;
    }
});

function setupSearchListeners(dataType, searchFunction) {
    const searchBtn = document.getElementById(`${dataType}SearchBtn`);
    const searchInput = document.getElementById(`${dataType}SearchInput`);
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchFunction);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                searchFunction();
            }
        });
    }
}

// Heuristic: decide if the query looks like an ID (EHI_, EIN_, or contains underscore+digits)
function isLikelyId(query) {
    if (!query || typeof query !== 'string') return false;
    const q = query.trim();
    // Common AmoebaDB IDs start with EHI_ or EIN_ or contain an underscore followed by digits
    if (/^\s*EHI_|^\s*EIN_/i.test(q)) return true;
    if (/_[0-9]/.test(q)) return true;
    // Also treat short alphanumeric codes with underscore+digits as IDs
    if (/^[A-Z]{1,4}_\d+/i.test(q)) return true;
    return false;
}

function createExpandableSection(title, content, isCompressedSequence = false) {
    const section = document.createElement('div');
    section.className = 'expandable-section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<span class="triangle">▶</span> ${title}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'section-content hidden';
    contentDiv.innerHTML = content;
    
    header.addEventListener('click', () => {
        header.querySelector('.triangle').textContent = contentDiv.classList.contains('hidden') ? '▼' : '▶';
        contentDiv.classList.toggle('hidden');
        
        // Only load compressed sequence data when expanded
        if (isCompressedSequence && !contentDiv.classList.contains('hidden') && !contentDiv.dataset.loaded) {
            contentDiv.innerHTML = `<div class="sequence-data">${content}</div>`;
            contentDiv.dataset.loaded = 'true';
        }
    });
    
    section.appendChild(header);
    section.appendChild(contentDiv);
    return section;
}

function createTranscriptCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    // Tolerant extraction of transcript ID (support multiple shapes)
    const transcriptId = item.transcript_id || item.id || (item.raw_header && (item.raw_header.match(/^([^|]+)/) || [])[1]) || item.header || 'Unknown';

    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `Transcript ID: ${transcriptId}`;
    card.appendChild(title);

    // Create expandable sections for different parts of the data
    // Raw header if present (AmoebaDB often puts many key=value pairs here)
    const rawHeader = item.raw_header || item.rawHeader || item.header || '';
    const parsed = parseHeaderMetadata(rawHeader);
    // Also parse any structured metadata embedded in the description field
    const parsedFromDescription = Object.assign({}, parsed, parseHeaderMetadata(item.description || item.desc || ''));

    // Extract common fields from top-level, parsed header, or parsed description
    const geneId = item.gene_id || parsedFromDescription.gene || parsedFromDescription.Gene || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || '';
    const lengthVal = item.length || parsedFromDescription.length || (item.attributes && item.attributes.length) || (item.sequence ? item.sequence.length : '');
    // Prefer explicit sequence_SO first (top-level then parsed then attributes)
    const sequenceSO = item.sequence_SO || parsedFromDescription.sequence_SO || parsedFromDescription.sequence_SO || (item.attributes && item.attributes.sequence_SO) || '';
    // Prefer SO (top-level then parsed then attributes)
    const soField = item.SO || parsed.SO || (item.attributes && item.attributes.SO) || 'N/A';
    // is_pseudo can be boolean or string in the header
    let isPseudo = typeof item.is_pseudo !== 'undefined' ? item.is_pseudo : (parsed.is_pseudo !== undefined ? parsed.is_pseudo : (item.attributes && item.attributes.is_pseudo));
    if (typeof isPseudo === 'string') {
        isPseudo = isPseudo.toLowerCase() === 'true';
    }
    if (typeof isPseudo === 'undefined') isPseudo = false;

    // Additional useful fields often present in AmoebaDB headers
    const geneProduct = parsedFromDescription.gene_product || parsedFromDescription.Gene_product || item.gene_product || '';
    const transcriptProduct = parsedFromDescription.transcript_product || item.transcript_product || '';
    const organism = parsedFromDescription.organism || item.organism || '';
    const location = parsedFromDescription.location || parsed.location || (item.attributes && item.attributes.location) || '';

    // Build Basic Information HTML conditionally (omit fields that are not present)
    let basicHtml = '';
    if (geneId) basicHtml += `<p><strong>Gene ID:</strong> ${geneId}</p>`;
    if (geneProduct) basicHtml += `<p><strong>Gene Product:</strong> ${geneProduct}</p>`;
    if (transcriptProduct) basicHtml += `<p><strong>Transcript Product:</strong> ${transcriptProduct}</p>`;
    if (organism) basicHtml += `<p><strong>Organism:</strong> ${organism}</p>`;
    if (location) basicHtml += `<p><strong>Location:</strong> ${location}</p>`;
    if (lengthVal) basicHtml += `<p><strong>Length:</strong> ${lengthVal}</p>`;
    if (sequenceSO) basicHtml += `<p><strong>Sequence SO:</strong> ${sequenceSO}</p>`;
    if (soField) basicHtml += `<p><strong>SO:</strong> ${soField}</p>`;
    basicHtml += `<p><strong>Is Pseudo:</strong> ${isPseudo}</p>`;
    const basicInfo = createExpandableSection('Basic Information', basicHtml);

    const seqContent = item.compressed_sequence || item.sequence || (item.attributes && item.attributes.sequence) || 'No sequence available';
    const sequenceInfo = createExpandableSection('Compressed Sequence', seqContent, true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function createProteinCard(item) {
    console.log('Creating protein card for item:', item);
    const card = document.createElement('div');
    card.className = 'info-card';

    // Tolerant extraction of protein ID
    const proteinId = item.protein_id || item.id || (item.raw_header && (item.raw_header.match(/^([^|]+)/) || [])[1]) || item.header || 'Unknown';

    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `Protein ID: ${proteinId}`;
    card.appendChild(title);

    // Create expandable sections for different parts of the data
    // Parse header metadata if present
    const rawHeader = item.raw_header || item.rawHeader || item.header || '';
    const parsed = parseHeaderMetadata(rawHeader);
    const parsedFromDescription = Object.assign({}, parsed, parseHeaderMetadata(item.description || item.desc || ''));

    // Extract protein-related fields from top-level, attributes, or parsed header/description
    const geneId = item.gene_id || parsedFromDescription.gene || parsedFromDescription.Gene || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || '';
    const product = item.gene_product || parsedFromDescription.gene_product || parsedFromDescription.Gene_product || (item.attributes && (item.attributes.gene_product || item.attributes.product)) || '';
    const transcriptProduct = parsedFromDescription.transcript_product || item.transcript_product || '';
    const proteinLen = item.protein_length || item.length || parsedFromDescription.protein_length || (item.sequence ? item.sequence.length : '');
    const organism = parsedFromDescription.organism || item.organism || '';
    const location = parsedFromDescription.location || parsed.location || (item.attributes && item.attributes.location) || '';
    const sequenceType = item.sequence_type || parsedFromDescription.sequence_type || '';
    const sequenceSO = item.sequence_SO || parsedFromDescription.sequence_SO || (item.attributes && item.attributes.sequence_SO) || '';
    const soField = item.SO || parsedFromDescription.SO || (item.attributes && item.attributes.SO) || '';
    let isPseudo = typeof item.is_pseudo !== 'undefined' ? item.is_pseudo : (parsedFromDescription.is_pseudo !== undefined ? parsedFromDescription.is_pseudo : (item.attributes && item.attributes.is_pseudo));
    if (typeof isPseudo === 'string') isPseudo = isPseudo.toLowerCase() === 'true';
    if (typeof isPseudo === 'undefined') isPseudo = false;

    // Build Basic Information HTML conditionally (omit Description paragraph; show parsed metadata)
    let proteinBasicHtml = '';
    if (geneId) proteinBasicHtml += `<p><strong>Gene ID:</strong> ${geneId}</p>`;
    if (product) proteinBasicHtml += `<p><strong>Product:</strong> ${product}</p>`;
    if (transcriptProduct) proteinBasicHtml += `<p><strong>Transcript Product:</strong> ${transcriptProduct}</p>`;
    if (organism) proteinBasicHtml += `<p><strong>Organism:</strong> ${organism}</p>`;
    if (location) proteinBasicHtml += `<p><strong>Location:</strong> ${location}</p>`;
    if (proteinLen) proteinBasicHtml += `<p><strong>Length:</strong> ${proteinLen} ${proteinLen ? 'aa' : ''}</p>`;
    if (sequenceSO) proteinBasicHtml += `<p><strong>Sequence SO:</strong> ${sequenceSO}</p>`;
    if (soField) proteinBasicHtml += `<p><strong>SO:</strong> ${soField}</p>`;
    if (sequenceType) proteinBasicHtml += `<p><strong>Sequence Type:</strong> ${sequenceType}</p>`;
    proteinBasicHtml += `<p><strong>Is Pseudo:</strong> ${isPseudo}</p>`;
    const basicInfo = createExpandableSection('Basic Information', proteinBasicHtml);

    const seqContent = item.compressed_sequence || item.sequence || (item.attributes && item.attributes.sequence) || 'No sequence available';
    const sequenceInfo = createExpandableSection('Compressed Sequence', seqContent, true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function createGeneCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    // Tolerant extraction of gene ID
    const geneId = item._id || item.id || item.gene_id || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || 'Unknown';

    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `Gene ID: ${geneId}`;
    card.appendChild(title);

    // Create expandable sections for different parts of the data
    const geneName = item.gene_name || item.name || (item.attributes && (item.attributes.gene || item.attributes.Name)) || 'N/A';
    const geneType = item.gene_type || item.type || (item.attributes && item.attributes.type) || 'N/A';
    const biotype = item.biotype_classification || item.biotype || 'N/A';

    const rawHeader = item.raw_header || item.rawHeader || item.header || 'N/A';
    const basicInfo = createExpandableSection('Basic Information', `
        <p><strong>Raw Header:</strong> ${rawHeader}</p>
        <p><strong>Gene Name:</strong> ${geneName}</p>
        <p><strong>Gene Type:</strong> ${geneType}</p>
        <p><strong>Biotype Classification:</strong> ${biotype}</p>
        <p><strong>Species:</strong> ${item.species || 'N/A'}</p>
        <p><strong>Strain:</strong> ${item.strain || 'N/A'}</p>
    `);

    // Genomic location may be stored in attributes for AmoebaDB
    const contig = item.genomic_location?.contig || (item.attributes && item.attributes.location) || 'N/A';
    const start = item.genomic_location?.start || (item.attributes && item.attributes.start) || 'N/A';
    const end = item.genomic_location?.end || (item.attributes && item.attributes.end) || 'N/A';
    const strand = item.genomic_location?.strand || (item.attributes && item.attributes.strand) || 'N/A';

    const locationInfo = createExpandableSection('Genomic Location', `
        <p><strong>Contig:</strong> ${contig}</p>
        <p><strong>Start:</strong> ${start}</p>
        <p><strong>End:</strong> ${end}</p>
        <p><strong>Strand:</strong> ${strand}</p>
    `);

    card.appendChild(basicInfo);
    card.appendChild(locationInfo);

    return card;
}

function createGenomeCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    // Tolerant extraction of sequence ID
    const sequenceId = item.sequence_id || item.seqid || item.id || item.accession || 'Unknown';

    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `Sequence ID: ${sequenceId}`;
    card.appendChild(title);

    // Prefer attributes for genome records (AmoebaDB)
    const attrs = item.attributes || {};

    // Some AmoebaDB exports embed useful key=value metadata inside the
    // `description` field (or header). Parse that first so we can display
    // organism, version, length, SO, etc. If not present, fall back to
    // top-level fields.
    const rawDescription = item.description || item.desc || attrs.description || '';
    const parsedFromDescription = parseHeaderMetadata(rawDescription);

    const organismDisplay = parsedFromDescription.organism || item.organism || attrs.organism || '';

    // Try to extract strain from either a parsed field or from organism string
    let strainDisplay = parsedFromDescription.strain || item.strain || attrs.strain || '';
    if (!strainDisplay && organismDisplay && organismDisplay.includes('_')) {
        // common AmoebaDB organism strings look like: Entamoeba_histolytica_HM-1:IMSS
        const parts = organismDisplay.split('_');
        if (parts.length >= 3) {
            strainDisplay = parts.slice(2).join('_');
        }
    }

    const versionDisplay = parsedFromDescription.version || item.version || attrs.version || '';
    const lengthVal = parsedFromDescription.length || item.length || attrs.length || (item.sequence ? item.sequence.length : '');
    const typeDisplay = parsedFromDescription.SO || item.type || attrs.SO || attrs.type || '';

    // Build Basic Information HTML conditionally (omit raw Description; show parsed metadata)
    let genomeBasicHtml = '';
    if (organismDisplay) genomeBasicHtml += `<p><strong>Organism:</strong> ${organismDisplay}</p>`;
    if (strainDisplay) genomeBasicHtml += `<p><strong>Strain:</strong> ${strainDisplay}</p>`;
    if (versionDisplay) genomeBasicHtml += `<p><strong>Version:</strong> ${versionDisplay}</p>`;
    if (lengthVal) genomeBasicHtml += `<p><strong>Length:</strong> ${lengthVal} bp</p>`;
    if (typeDisplay) genomeBasicHtml += `<p><strong>Type:</strong> ${typeDisplay}</p>`;

    const basicInfo = createExpandableSection('Basic Information', genomeBasicHtml || '<p>No basic metadata available.</p>');

    const seqContent = item.compressed_sequence || item.sequence || attrs.sequence || 'No sequence available';
    const sequenceInfo = createExpandableSection('Compressed Sequence', seqContent, true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function hideAllSearchBars() {
    const ids = [
        'transcriptSearchContainer','proteinSearchContainer','geneSearchContainer',
        'genomeSearchContainer','cdsSearchContainer','codonUsageSearchContainer',
        'geneAliasesSearchContainer','fullGFFSearchContainer','orfSearchContainer'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// Helpers to hide/show the homepage featured images so they don't appear
// in the results area when dataset views or searches are active.
function hideHomeGallery() {
    const g = document.getElementById('homeImageGallery');
    if (g) g.style.display = 'none';
}

function showHomeGallery() {
    const g = document.getElementById('homeImageGallery');
    if (g) g.style.display = '';
}

// Show the back-to-home button container
function showBackButton() {
    const el = document.getElementById('backButtonContainer');
    if (el) el.style.display = 'block';
}

async function loadData(dataType, organism = 'histolytica') {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '<h2>Loading...</h2>';
    // Store current data type
    currentDataType = dataType;
    
    // per-dataset search bars removed; keep only the global search bar
    hideAllSearchBars();
    // Hide the homepage featured images while dataset view is active
    hideHomeGallery();
    
    try {
        let endpoint = '';
        
        if (organism === 'histolytica') {
            if (dataType === 'transcriptomics') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedTranscripts.json';
            } else if (dataType === 'protein') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json';
            } else if (dataType === 'cds') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedCDSs.json';
            } else if (dataType === 'genome') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_Genome.json';
            } else if (dataType === 'codon-usage') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_CodonUsage.json';
            } else if (dataType === 'gene-aliases') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json';
            } else if (dataType === 'orf') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_Orf50.json';
            } else if (dataType === 'full-gff') {
                endpoint = 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS.json';
            }
        } else if (organism === 'invadens') {
            if (dataType === 'transcriptomics') {
                endpoint = 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedTranscripts.json';
            } else if (dataType === 'protein') {
                endpoint = 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedProteins.json';
            } else if (dataType === 'cds') {
                endpoint = 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedCDSs.json';
            } else if (dataType === 'genome') {
                endpoint = 'Data/Entamoeba%20Invadens/EinvadensIP1_Genome.json';
            } else if (dataType === 'codon-usage') {
                endpoint = 'Data/Entamoeba%20Invadens/EinvadensIP1_CodonUsage.json';
            } else if (dataType === 'gene-aliases') {
                endpoint = 'Data/Entamoeba%20Invadens/EinvadensIP1_GeneAliases.json';
            } else if (dataType === 'full-gff') {
                endpoint = 'Data/Entamoeba%20Invadens/AmoebaDB-68_EinvadensIP1.json';
            } else if (dataType === 'orf') {
                endpoint = 'Data/Entamoeba%20Invadens/AmoebaDB-68_EinvadensIP1_Orf50.json';
            }
        }

        console.log('Loading data from:', endpoint);
        console.log('Data type requested:', dataType, 'for organism:', organism);
        
        const response = await fetch(endpoint);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            console.error('Failed to fetch:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        console.log('Parsing JSON...');
        const raw = await response.json();
        // Normalize structures: some files use { records: [...] } or { features: [...] }
        const data = (function normalizeLoadedData(obj) {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj.records)) return obj.records;
            if (Array.isArray(obj.features)) return obj.features;
            if (Array.isArray(obj.data)) return obj.data;
            // Some AmoebaDB files use { source, records: [...] } - covered above
            // If object contains only one top-level array-like property, try to find it
            for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) return obj[key];
            }
            return [];
        })(raw);
        console.log('Data loaded successfully, items count:', data.length);

        // Special-case: some codon-usage files are exported as a 2D array
        // where the first row is the header names (e.g. ["CODON","AA","FREQ","ABUNDANCE"]) and
        // subsequent rows are arrays of values. Convert these into objects so the rest
        // of the app can consume { CODON, AA, FREQ, ABUNDANCE } as expected.
        if (dataType === 'codon-usage' && data && data.length > 0 && Array.isArray(data[0])) {
            const headerRow = data[0].map(h => String(h).trim());
            const rows = data.slice(1);
            const mapped = rows.map(row => {
                const obj = {};
                headerRow.forEach((h, i) => {
                    // Trim values and normalize empty strings to null
                    obj[h] = typeof row[i] === 'string' ? row[i].trim() : row[i];
                });
                return obj;
            });
            // Replace data with mapped objects for downstream consumers
            // and update the length log
            console.log('Converted codon-usage 2D-array to objects, items count:', mapped.length);
            // assign to data variable so subsequent code uses objects
            // (we shadow the const data by using a let alias above?)
            // Since `data` is a const, create a new variable `normalizedData`
            var normalizedData = mapped;
        } else if (dataType === 'gene-aliases' && data && data.length > 0 && Array.isArray(data[0])) {
            // Many gene-aliases files are arrays-of-arrays; convert each inner array
            // into a simple object so the card renderer can iterate entries.
            const mappedAliases = data.map(row => ({ aliases: Array.isArray(row) ? row : [row] }));
            console.log('Normalized gene-aliases 2D-array to objects, items count:', mappedAliases.length);
            var normalizedData = mappedAliases;
        } else {
            var normalizedData = data;
        }
        
        // Store data for searching based on type
        if (dataType === 'transcriptomics') {
            currentTranscriptData = normalizedData;
        } else if (dataType === 'protein') {
            currentProteinData = normalizedData;
        } else if (dataType === 'gene') {
            currentGeneData = normalizedData;
        } else if (dataType === 'genome') {
            currentGenomeData = normalizedData;
        } else if (dataType === 'cds') {
            currentCDSData = normalizedData;
        } else if (dataType === 'codon-usage') {
            currentCodonUsageData = normalizedData;
        } else if (dataType === 'gene-aliases') {
            currentGeneAliasesData = normalizedData;
        } else if (dataType === 'full-gff') {
            currentFullGFFData = normalizedData;
        } else if (dataType === 'orf') {
            currentORFData = normalizedData;
        }
        
        resultsContainer.innerHTML = '';
        if (!data || data.length === 0) {
            resultsContainer.innerHTML = '<p>No data available.</p>';
            return;
        }

        console.log('Creating cards for', normalizedData.length, 'items');
        normalizedData.forEach((item, index) => {
            console.log(`Processing item ${index + 1}:`, item.protein_id || item.transcript_id || item._id || item.sequence_id || item.header || item.seqid);
            let card;
            if (dataType === 'transcriptomics') {
                card = organism === 'invadens' ? createInvadensTranscriptCard(item) : createTranscriptCard(item);
            } else if (dataType === 'protein') {
                card = organism === 'invadens' ? createInvadensProteinCard(item) : createProteinCard(item);
            } else if (dataType === 'gene') {
                card = createGeneCard(item);
            } else if (dataType === 'genome') {
                card = organism === 'invadens' ? createInvadensGenomeCard(item) : createGenomeCard(item);
            } else if (dataType === 'cds') {
                // Use organism-specific CDS card creators
                card = organism === 'invadens' ? createInvadensCDSCard(item) : createHistolyticaCDSCard(item);
            } else if (dataType === 'codon-usage') {
                card = createInvadensCodonUsageCard(item);
            } else if (dataType === 'gene-aliases') {
                card = createInvadensGeneAliasesCard(item, index);
        } else if (dataType === 'full-gff') {
            // Use the tolerant Full GFF renderer for all organisms
            card = createFullGFFCard(item);
            } else if (dataType === 'orf') {
                card = createInvadensORFCard(item);
            }
            if (card) {
                resultsContainer.appendChild(card);
                console.log('Appended card to container');
            } else {
                console.error('Failed to create card for item:', item);
            }
        });
    } catch (error) {
        console.error(`Failed to load ${dataType} data:`, error);
        console.error('Error details:', error.stack);
        resultsContainer.innerHTML = `<div class="info-card" style="border-left: 4px solid red;"><h4>Error Loading Data</h4><p><strong>Failed to load ${dataType} data:</strong><br>${error.message}</p><p><strong>Endpoint:</strong> ${endpoint || 'Unknown'}</p></div>`;
    }
}

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        alert("Please enter a search query.");
        return;
    }

    // Show back button when a search is initiated
    showBackButton();

    // Hide the homepage gallery when showing search results
    hideHomeGallery();

    if (query === "Entamoeba Histolytica transcripts") {
        await loadData('transcriptomics');
    } else if (query === "Entamoeba Histolytica Protein Sequence") {
        await loadData('protein');
    } else if (query === "Entamoeba Histolytica Gene") {
        await loadData('gene');
    } else if (query === "Entamoeba Histolytica Genome") {
        await loadData('genome');
    } else {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '<h2>Searching...</h2>';

        // Show back button when performing a search so user can return home
        showBackButton();

        try {
            const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const results = await response.json();
            
            resultsContainer.innerHTML = '';
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p>No results found for "' + query + '".</p>';
            } else {
                results.forEach((item, index) => {
                    const infoCard = document.createElement('div');
                    infoCard.className = 'info-card';
                    infoCard.innerHTML = `
                        <h4>Document ${index + 1}</h4>
                        <h3>${item.gene_id || 'N/A'}</h3>
                        <p>${item.gene_product || 'No description available.'}</p>
                    `;
                    resultsContainer.appendChild(infoCard);
                });
            }
        } catch (error) {
            resultsContainer.innerHTML = `<p style="color: red;">Error: Failed to fetch search results. Check your server connection.</p>`;
            console.error("Failed to fetch search results:", error);
        }
    }
}

function performTranscriptSearch() {
    const searchInput = document.getElementById('transcriptSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Transcript ID to search');
        return;
    }
    
        if (currentTranscriptData.length === 0) {
        alert('No transcript data loaded. Please click on transcripts first.');
        return;
    }
    
    // Search for matching transcript IDs
    const matchingTranscripts = currentTranscriptData.filter(item => {
        return item.transcript_id && item.transcript_id.toLowerCase().includes(query);
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingTranscripts.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No transcripts found with ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Transcript ID (e.g., EHI_151170A)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingTranscripts.length}</strong> transcript(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching transcripts
        matchingTranscripts.forEach(item => {
            const card = createTranscriptCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Transcript search for "${query}" found ${matchingTranscripts.length} results`);
}

function performProteinSearch() {
    const searchInput = document.getElementById('proteinSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Protein ID to search');
        return;
    }
    
    if (currentProteinData.length === 0) {
        alert('No protein data loaded. Please click on Protein Sequence first.');
        return;
    }
    
    // Search for matching protein IDs
    const matchingProteins = currentProteinData.filter(item => {
        return item.protein_id && item.protein_id.toLowerCase().includes(query);
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingProteins.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No proteins found with ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Protein ID (e.g., EHI_151170A-p1)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingProteins.length}</strong> protein(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching proteins
        matchingProteins.forEach(item => {
            const card = createProteinCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Protein search for "${query}" found ${matchingProteins.length} results`);
}

function performGeneSearch() {
    const searchInput = document.getElementById('geneSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Gene ID to search');
        return;
    }
    
    if (currentGeneData.length === 0) {
        alert('No gene data loaded. Please click on Gene first.');
        return;
    }
    
    // Search for matching gene IDs
    const matchingGenes = currentGeneData.filter(item => {
        return item._id && item._id.toLowerCase().includes(query);
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingGenes.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No genes found with ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Gene ID (e.g., EHI_151170)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingGenes.length}</strong> gene(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching genes
        matchingGenes.forEach(item => {
            const card = createGeneCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Gene search for "${query}" found ${matchingGenes.length} results`);
}

function performGenomeSearch() {
    const searchInput = document.getElementById('genomeSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Sequence ID to search');
        return;
    }
    
    if (currentGenomeData.length === 0) {
        alert('No genome data loaded. Please click on Genome first.');
        return;
    }
    
    // Search for matching sequence IDs
    const matchingGenomes = currentGenomeData.filter(item => {
        const idCandidates = [item.sequence_id, item.seqid, item.id, item.accession];
        return idCandidates.some(val => val && val.toString().toLowerCase().includes(query));
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingGenomes.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No genome sequences found with ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Sequence ID</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingGenomes.length}</strong> genome sequence(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching genomes
        matchingGenomes.forEach(item => {
            const card = createGenomeCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Genome search for "${query}" found ${matchingGenomes.length} results`);
}

// Card creation functions for Entamoeba Invadens data types

function createInvadensTranscriptCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    // Prefer explicit transcript_id, then header prefix, then other fallbacks
    const headerText = item.raw_header || item.header || '';
    const headerMatch = headerText.match(/^([^|]+)/) || [];
    const transcriptId = item.transcript_id || item.id || (headerMatch[1] ? headerMatch[1].trim() : '') || 'Unknown';

    // Some Invadens records also embed key=value metadata inside description
    const rawDescription = item.description || item.desc || item.attributes && item.attributes.description || '';
    const parsed = Object.assign({}, parseHeaderMetadata(headerText), parseHeaderMetadata(rawDescription));
    const cleanedDescription = rawDescription ? rawDescription.replace(/^\|+/, '').trim() : '';

    const geneId = item.gene_id || parsed.gene || parsed.Gene || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || '';
    const lengthVal = item.sequence ? item.sequence.length : (item.length || parsed.length || '');
    const sequenceSO = item.sequence_SO || parsed.sequence_SO || '';
    const soField = item.SO || parsed.SO || '';
    let isPseudo = typeof item.is_pseudo !== 'undefined' ? item.is_pseudo : (parsed.is_pseudo !== undefined ? parsed.is_pseudo : (item.attributes && item.attributes.is_pseudo));
    if (typeof isPseudo === 'string') isPseudo = isPseudo.toLowerCase() === 'true';
    if (typeof isPseudo === 'undefined') isPseudo = false;

    const geneProduct = parsed.gene_product || parsed.Gene_product || item.gene_product || '';
    const transcriptProduct = parsed.transcript_product || item.transcript_product || '';
    const organism = parsed.organism || item.organism || '';
    const location = parsed.location || (item.attributes && item.attributes.location) || '';

    // Title
    const title = document.createElement('h3');
    title.textContent = `Transcript ID: ${transcriptId}`;
    card.appendChild(title);

    // Build Basic Information HTML conditionally
    let basicHtml = '';
    if (cleanedDescription) basicHtml += `<p><strong>Description:</strong> ${cleanedDescription}</p>`;
    if (geneId) basicHtml += `<p><strong>Gene ID:</strong> ${geneId}</p>`;
    if (geneProduct) basicHtml += `<p><strong>Gene Product:</strong> ${geneProduct}</p>`;
    if (transcriptProduct) basicHtml += `<p><strong>Transcript Product:</strong> ${transcriptProduct}</p>`;
    if (organism) basicHtml += `<p><strong>Organism:</strong> ${organism}</p>`;
    if (location) basicHtml += `<p><strong>Location:</strong> ${location}</p>`;
    if (lengthVal) basicHtml += `<p><strong>Length:</strong> ${lengthVal} bp</p>`;
    if (sequenceSO) basicHtml += `<p><strong>Sequence SO:</strong> ${sequenceSO}</p>`;
    if (soField) basicHtml += `<p><strong>SO:</strong> ${soField}</p>`;
    basicHtml += `<p><strong>Is Pseudo:</strong> ${isPseudo}</p>`;

    const basicInfo = createExpandableSection('Basic Information', basicHtml || '<p>No basic metadata available.</p>');
    const sequenceInfo = createExpandableSection('Sequence', item.sequence || 'No sequence available', true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function createInvadensProteinCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    const headerText = item.raw_header || item.header || '';
    const headerMatch = headerText.match(/^([^|]+)/) || [];
    const proteinId = item.protein_id || item.id || (headerMatch[1] ? headerMatch[1].trim() : '') || 'Unknown';

    const rawDescription = item.description || item.desc || (item.attributes && item.attributes.description) || '';
    const parsed = Object.assign({}, parseHeaderMetadata(headerText), parseHeaderMetadata(rawDescription));
    const cleanedDescription = rawDescription ? rawDescription.replace(/^\|+/, '').trim() : '';

    const geneId = item.gene_id || parsed.gene || parsed.Gene || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || '';
    const description = cleanedDescription || item.description || parsed.description || '';
    const product = item.gene_product || parsed.gene_product || parsed.Gene_product || (item.attributes && (item.attributes.gene_product || item.attributes.product)) || '';
    const transcriptProduct = parsed.transcript_product || item.transcript_product || '';
    const proteinLen = item.protein_length || item.length || parsed.protein_length || (item.sequence ? item.sequence.length : '');
    const organism = parsed.organism || item.organism || '';
    const location = parsed.location || (item.attributes && item.attributes.location) || '';
    const sequenceType = item.sequence_type || parsed.sequence_type || '';
    const sequenceSO = item.sequence_SO || parsed.sequence_SO || (item.attributes && item.attributes.sequence_SO) || '';
    const soField = item.SO || parsed.SO || (item.attributes && item.attributes.SO) || '';
    let isPseudo = typeof item.is_pseudo !== 'undefined' ? item.is_pseudo : (parsed.is_pseudo !== undefined ? parsed.is_pseudo : (item.attributes && item.attributes.is_pseudo));
    if (typeof isPseudo === 'string') isPseudo = isPseudo.toLowerCase() === 'true';
    if (typeof isPseudo === 'undefined') isPseudo = false;

    // Title
    const title = document.createElement('h3');
    title.textContent = `Protein ID: ${proteinId}`;
    card.appendChild(title);

    // Basic info
    let proteinBasicHtml = '';
    if (description) proteinBasicHtml += `<p><strong>Description:</strong> ${description}</p>`;
    if (geneId) proteinBasicHtml += `<p><strong>Gene ID:</strong> ${geneId}</p>`;
    if (product) proteinBasicHtml += `<p><strong>Product:</strong> ${product}</p>`;
    if (transcriptProduct) proteinBasicHtml += `<p><strong>Transcript Product:</strong> ${transcriptProduct}</p>`;
    if (organism) proteinBasicHtml += `<p><strong>Organism:</strong> ${organism}</p>`;
    if (location) proteinBasicHtml += `<p><strong>Location:</strong> ${location}</p>`;
    if (proteinLen) proteinBasicHtml += `<p><strong>Length:</strong> ${proteinLen} ${proteinLen ? 'aa' : ''}</p>`;
    if (sequenceSO) proteinBasicHtml += `<p><strong>Sequence SO:</strong> ${sequenceSO}</p>`;
    if (soField) proteinBasicHtml += `<p><strong>SO:</strong> ${soField}</p>`;
    if (sequenceType) proteinBasicHtml += `<p><strong>Sequence Type:</strong> ${sequenceType}</p>`;
    proteinBasicHtml += `<p><strong>Is Pseudo:</strong> ${isPseudo}</p>`;

    const basicInfo = createExpandableSection('Basic Information', proteinBasicHtml || '<p>No basic metadata available.</p>');
    const sequenceInfo = createExpandableSection('Protein Sequence', item.sequence || 'No sequence available', true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function createInvadensCDSCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    const headerText = item.raw_header || item.header || '';
    const headerMatch = headerText.match(/^([^|]+)/) || [];
    const cdsId = item.id || (headerMatch[1] ? headerMatch[1].trim() : '') || 'Unknown';

    const rawDescription = item.description || item.desc || (item.attributes && item.attributes.description) || '';
    const parsed = Object.assign({}, parseHeaderMetadata(headerText), parseHeaderMetadata(rawDescription));
    const cleanedDescription = rawDescription ? rawDescription.replace(/^\|+/, '').trim() : '';

    const geneId = item.gene_id || parsed.gene || parsed.Gene || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || '';
    const transcriptId = item.transcript_id || parsed.transcript || parsed.transcript_id || '';
    const location = parsed.location || (item.attributes && item.attributes.location) || '';
    const lengthVal = item.sequence ? item.sequence.length : (item.length || parsed.length || '');
    const sequenceSO = item.sequence_SO || parsed.sequence_SO || (item.attributes && item.attributes.sequence_SO) || '';
    const soField = item.SO || parsed.SO || (item.attributes && item.attributes.SO) || '';
    let isPseudo = typeof item.is_pseudo !== 'undefined' ? item.is_pseudo : (parsed.is_pseudo !== undefined ? parsed.is_pseudo : (item.attributes && item.attributes.is_pseudo));
    if (typeof isPseudo === 'string') isPseudo = isPseudo.toLowerCase() === 'true';
    if (typeof isPseudo === 'undefined') isPseudo = false;

    // Title
    const title = document.createElement('h3');
    title.textContent = `CDS ID: ${cdsId}`;
    card.appendChild(title);

    // Build Basic Information HTML conditionally
    let cdsBasicHtml = '';
    if (cleanedDescription) cdsBasicHtml += `<p><strong>Description:</strong> ${cleanedDescription}</p>`;
    if (geneId) cdsBasicHtml += `<p><strong>Gene ID:</strong> ${geneId}</p>`;
    if (transcriptId) cdsBasicHtml += `<p><strong>Transcript ID:</strong> ${transcriptId}</p>`;
    if (location) cdsBasicHtml += `<p><strong>Location:</strong> ${location}</p>`;
    if (lengthVal) cdsBasicHtml += `<p><strong>Length:</strong> ${lengthVal} bp</p>`;
    if (sequenceSO) cdsBasicHtml += `<p><strong>Sequence SO:</strong> ${sequenceSO}</p>`;
    if (soField) cdsBasicHtml += `<p><strong>SO:</strong> ${soField}</p>`;
    cdsBasicHtml += `<p><strong>Is Pseudo:</strong> ${isPseudo}</p>`;

    const basicInfo = createExpandableSection('Basic Information', cdsBasicHtml || '<p>No basic metadata available.</p>');
    const sequenceInfo = createExpandableSection('CDS Sequence', item.sequence || 'No sequence available', true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

// CDS card renderer for Entamoeba histolytica (AmoebaDB-style records)
function createHistolyticaCDSCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    // Tolerant CDS ID extraction (id, raw_header, description)
    const cdsId = item.id || (item.raw_header && (item.raw_header.match(/^([^|]+)/) || [])[1]) || item.header || item.description || 'Unknown';

    const title = document.createElement('h3');
    title.textContent = `CDS ID: ${cdsId}`;
    card.appendChild(title);

    const attrs = item.attributes || {};
    // Parse raw header for AmoebaDB-style key=value pairs
    const rawHeader = item.raw_header || item.rawHeader || item.header || '';
    const parsed = parseHeaderMetadata(rawHeader);
    const parsedFromDescription = Object.assign({}, parsed, parseHeaderMetadata(item.description || ''));

    // Extract common CDS fields from top-level, attributes, or parsed header/description
    const product = attrs.product || item.product || parsedFromDescription.product || parsedFromDescription.gene_product || parsedFromDescription.Gene_product || '';
    const geneId = item.gene_id || parsedFromDescription.gene || parsedFromDescription.Gene || (item.attributes && (item.attributes.gene || item.attributes.locus_tag)) || '';
    const transcriptId = item.transcript_id || parsedFromDescription.transcript || parsedFromDescription.transcript_id || '';
    const location = parsedFromDescription.location || parsed.location || attrs.location || '';
    const lengthVal = item.length || parsedFromDescription.length || attrs.length || (item.sequence ? item.sequence.length : '');
    const sequenceSO = item.sequence_SO || parsedFromDescription.sequence_SO || (attrs && attrs.sequence_SO) || '';
    const soField = item.SO || parsedFromDescription.SO || (attrs && attrs.SO) || '';
    let isPseudo = typeof item.is_pseudo !== 'undefined' ? item.is_pseudo : (parsedFromDescription.is_pseudo !== undefined ? parsedFromDescription.is_pseudo : (attrs && attrs.is_pseudo));
    if (typeof isPseudo === 'string') isPseudo = isPseudo.toLowerCase() === 'true';
    if (typeof isPseudo === 'undefined') isPseudo = false;

    // Build Basic Information HTML conditionally (omit raw Description paragraph; show parsed metadata)
    let cdsBasicHtml = '';
    if (geneId) cdsBasicHtml += `<p><strong>Gene ID:</strong> ${geneId}</p>`;
    if (transcriptId) cdsBasicHtml += `<p><strong>Transcript ID:</strong> ${transcriptId}</p>`;
    // Product is often duplicate of description, keep only if present and distinct
    if (product) cdsBasicHtml += `<p><strong>Product:</strong> ${product}</p>`;
    if (location) cdsBasicHtml += `<p><strong>Location:</strong> ${location}</p>`;
    if (lengthVal) cdsBasicHtml += `<p><strong>Length:</strong> ${lengthVal} bp</p>`;
    if (sequenceSO) cdsBasicHtml += `<p><strong>Sequence SO:</strong> ${sequenceSO}</p>`;
    if (soField) cdsBasicHtml += `<p><strong>SO:</strong> ${soField}</p>`;
    cdsBasicHtml += `<p><strong>Is Pseudo:</strong> ${isPseudo}</p>`;
    const basicInfo = createExpandableSection('Basic Information', cdsBasicHtml || '<p>No basic metadata available.</p>');

    const seqContent = item.compressed_sequence || item.sequence || attrs.sequence || 'No sequence available';
    const sequenceInfo = createExpandableSection('CDS Sequence', seqContent, true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function createInvadensGenomeCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    const headerText = item.raw_header || item.header || '';
    const headerMatch = headerText.match(/^([^|]+)/) || [];
    const sequenceId = item.sequence_id || item.seqid || item.id || (headerMatch[1] ? headerMatch[1].trim() : '') || 'Unknown';

    const rawDescription = item.description || item.desc || (item.attributes && item.attributes.description) || '';
    const parsed = Object.assign({}, parseHeaderMetadata(headerText), parseHeaderMetadata(rawDescription));
    const cleanedDescription = rawDescription ? rawDescription.replace(/^\|+/, '').trim() : '';

    const organismDisplay = parsed.organism || item.organism || (item.attributes && item.attributes.organism) || '';
    let strainDisplay = parsed.strain || item.strain || (item.attributes && item.attributes.strain) || '';
    if (!strainDisplay && organismDisplay && organismDisplay.includes('_')) {
        const parts = organismDisplay.split('_');
        if (parts.length >= 3) strainDisplay = parts.slice(2).join('_');
    }
    const versionDisplay = parsed.version || item.version || (item.attributes && item.attributes.version) || '';
    const lengthVal = parsed.length || item.length || (item.sequence ? item.sequence.length : '');
    const typeDisplay = parsed.SO || item.type || (item.attributes && (item.attributes.SO || item.attributes.type)) || '';

    // Title
    const title = document.createElement('h3');
    title.textContent = `Sequence ID: ${sequenceId}`;
    card.appendChild(title);

    // Build Basic Information HTML conditionally
    let genomeBasicHtml = '';
    if (cleanedDescription) genomeBasicHtml += `<p><strong>Description:</strong> ${cleanedDescription}</p>`;
    if (organismDisplay) genomeBasicHtml += `<p><strong>Organism:</strong> ${organismDisplay}</p>`;
    if (strainDisplay) genomeBasicHtml += `<p><strong>Strain:</strong> ${strainDisplay}</p>`;
    if (versionDisplay) genomeBasicHtml += `<p><strong>Version:</strong> ${versionDisplay}</p>`;
    if (lengthVal) genomeBasicHtml += `<p><strong>Length:</strong> ${lengthVal} bp</p>`;
    if (typeDisplay) genomeBasicHtml += `<p><strong>Type:</strong> ${typeDisplay}</p>`;

    const basicInfo = createExpandableSection('Basic Information', genomeBasicHtml || '<p>No basic metadata available.</p>');
    const sequenceInfo = createExpandableSection('Genome Sequence', item.sequence || 'No sequence available', true);

    card.appendChild(basicInfo);
    card.appendChild(sequenceInfo);

    return card;
}

function createInvadensCodonUsageCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';
    
    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `Codon: ${item.CODON} → ${item.AA}`;
    card.appendChild(title);
    
    // Create expandable sections for different parts of the data
    const basicInfo = createExpandableSection('Codon Usage Statistics', `
        <p><strong>Codon:</strong> ${item.CODON || 'N/A'}</p>
        <p><strong>Amino Acid:</strong> ${item.AA || 'N/A'}</p>
        <p><strong>Frequency:</strong> ${item.FREQ || 'N/A'}</p>
        <p><strong>Abundance:</strong> ${item.ABUNDANCE || 'N/A'}</p>
    `);
    
    card.appendChild(basicInfo);
    
    return card;
}

function createInvadensGeneAliasesCard(item, index) {
    const card = document.createElement('div');
    card.className = 'info-card';
    
    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `Gene Aliases Set ${index + 1}`;
    card.appendChild(title);
    
    // Create expandable sections for different parts of the data
    let aliasesHtml = '<div class="aliases-grid">';
    Object.entries(item).forEach(([key, value]) => {
        aliasesHtml += `<p><strong>${key}:</strong> ${value}</p>`;
    });
    aliasesHtml += '</div>';
    
    const basicInfo = createExpandableSection('Gene Aliases', aliasesHtml);
    
    card.appendChild(basicInfo);
    
    return card;
}

function createInvadensFullGFFCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';
    
    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `${item.type || 'Feature'}: ${item.seqid || 'Unknown'}`;
    card.appendChild(title);
    
    // Create expandable sections for different parts of the data
    const basicInfo = createExpandableSection('GFF Feature Information', `
        <p><strong>Sequence ID:</strong> ${item.seqid || 'N/A'}</p>
        <p><strong>Source:</strong> ${item.source || 'N/A'}</p>
        <p><strong>Type:</strong> ${item.type || 'N/A'}</p>
        <p><strong>Start:</strong> ${item.start || 'N/A'}</p>
        <p><strong>End:</strong> ${item.end || 'N/A'}</p>
        <p><strong>Score:</strong> ${item.score || 'N/A'}</p>
        <p><strong>Strand:</strong> ${item.strand || 'N/A'}</p>
        <p><strong>Phase:</strong> ${item.phase || 'N/A'}</p>
    `);
    
    let attributesHtml = '';
    if (item.attributes && typeof item.attributes === 'object') {
        Object.entries(item.attributes).forEach(([key, value]) => {
            attributesHtml += `<p><strong>${key}:</strong> ${value}</p>`;
        });
    }
    
    if (attributesHtml) {
        const attributesInfo = createExpandableSection('Attributes', attributesHtml);
        card.appendChild(attributesInfo);
    }
    
    card.appendChild(basicInfo);
    
    return card;
}

// Generic Full GFF card renderer that tolerates multiple field shapes
function createFullGFFCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';

    // Try common name variants for seqid and feature type
    const seqid = item.seqid || item.seq_id || item.seqId || item.seq || item.sequence_id || item.accession || item.seqname || 'Unknown';
    const featType = item.type || item.feature || item.feature_type || item.subtype || 'Feature';

    // Title
    const title = document.createElement('h3');
    title.textContent = `${featType}: ${seqid}`;
    card.appendChild(title);

    // Normalize common fields
    const source = item.source || item.src || item.provider || item.datasource || 'N/A';
    const start = item.start || item.begin || item.from || item.s || 'N/A';
    const end = item.end || item.to || item.stop || item.e || 'N/A';
    const score = (typeof item.score !== 'undefined' && item.score !== null) ? item.score : (item.qual || 'N/A');
    const strand = item.strand || item.str || item.sc || 'N/A';
    const phase = item.phase || item.frame || 'N/A';

    // Attributes can be an object or a semicolon-separated string (GFF3 style)
    let attributesObj = {};
    if (item.attributes && typeof item.attributes === 'object') {
        attributesObj = item.attributes;
    } else if (item.attributes && typeof item.attributes === 'string') {
        // parse key=value;key2=value2
        item.attributes.split(';').forEach(pair => {
            const kv = pair.split('=');
            if (kv[0]) attributesObj[kv[0].trim()] = (kv[1] || '').trim();
        });
    } else if (item.attrs && typeof item.attrs === 'object') {
        attributesObj = item.attrs;
    } else if (item.attributes_string && typeof item.attributes_string === 'string') {
        item.attributes_string.split(';').forEach(pair => {
            const kv = pair.split('=');
            if (kv[0]) attributesObj[kv[0].trim()] = (kv[1] || '').trim();
        });
    } else if (item.attribute && typeof item.attribute === 'string') {
        item.attribute.split(';').forEach(pair => {
            const kv = pair.split('=');
            if (kv[0]) attributesObj[kv[0].trim()] = (kv[1] || '').trim();
        });
    }

    // Build Basic Information section
    let basicHtml = '';
    basicHtml += `<p><strong>Sequence ID:</strong> ${seqid}</p>`;
    basicHtml += `<p><strong>Source:</strong> ${source}</p>`;
    basicHtml += `<p><strong>Type:</strong> ${featType}</p>`;
    basicHtml += `<p><strong>Start:</strong> ${start}</p>`;
    basicHtml += `<p><strong>End:</strong> ${end}</p>`;
    basicHtml += `<p><strong>Score:</strong> ${score}</p>`;
    basicHtml += `<p><strong>Strand:</strong> ${strand}</p>`;
    basicHtml += `<p><strong>Phase:</strong> ${phase}</p>`;

    const basicInfo = createExpandableSection('Attributes', basicHtml);

    // Attributes section
    let attributesHtml = '';
    if (attributesObj && Object.keys(attributesObj).length > 0) {
        Object.entries(attributesObj).forEach(([k, v]) => {
            attributesHtml += `<p><strong>${k}:</strong> ${v}</p>`;
        });
    } else {
        // Some files embed attributes in various other fields; try common fallback names
        const fallback = item.attribute || item.attributes || item.attrs || item.GFF_attributes || item.info || '';
        if (typeof fallback === 'string' && fallback.trim()) {
            // try parse semicolon or space separated
            const parts = fallback.split(/[;|,]/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
                const kv = p.split('=');
                if (kv.length === 2) attributesHtml += `<p><strong>${kv[0].trim()}:</strong> ${kv[1].trim()}</p>`;
                else attributesHtml += `<p>${p}</p>`;
            });
        }
    }

    const attributesInfo = createExpandableSection('GFF Feature Information', attributesHtml || '<p>No attributes available.</p>');

    card.appendChild(basicInfo);
    card.appendChild(attributesInfo);

    return card;
}

function createInvadensORFCard(item) {
    const card = document.createElement('div');
    card.className = 'info-card';
    
    // Main title that's always visible
    const title = document.createElement('h3');
    title.textContent = `ORF: ${item.seqid || 'Unknown'} (${item.start}-${item.end})`;
    card.appendChild(title);
    
    // Create expandable sections for different parts of the data
    const basicInfo = createExpandableSection('ORF Information', `
        <p><strong>Sequence ID:</strong> ${item.seqid || 'N/A'}</p>
        <p><strong>Source:</strong> ${item.source || 'N/A'}</p>
        <p><strong>Type:</strong> ${item.type || 'N/A'}</p>
        <p><strong>Start:</strong> ${item.start || 'N/A'}</p>
        <p><strong>End:</strong> ${item.end || 'N/A'}</p>
        <p><strong>Length:</strong> ${item.start && item.end ? (item.end - item.start + 1) : 'N/A'} bp</p>
        <p><strong>Strand:</strong> ${item.strand || 'N/A'}</p>
        <p><strong>Score:</strong> ${item.score || 'N/A'}</p>
        <p><strong>Phase:</strong> ${item.phase || 'N/A'}</p>
    `);
    
    let attributesHtml = '';
    if (item.attributes && typeof item.attributes === 'object') {
        Object.entries(item.attributes).forEach(([key, value]) => {
            attributesHtml += `<p><strong>${key}:</strong> ${value}</p>`;
        });
    }
    
    if (attributesHtml) {
        const attributesInfo = createExpandableSection('Attributes', attributesHtml);
        card.appendChild(attributesInfo);
    }
    
    card.appendChild(basicInfo);
    
    return card;
}

// Search functions for new Entamoeba Invadens data types

function performCDSSearch() {
    const searchInput = document.getElementById('cdsSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a CDS ID to search');
        return;
    }
    
    if (currentCDSData.length === 0) {
        alert('No CDS data loaded. Please click on CDS first.');
        return;
    }
    
    // Search for matching CDS IDs in multiple possible fields (header for Invadens, raw_header/id for Histolytica)
    const matchingCDS = currentCDSData.filter(item => {
        const candidates = [item.header, item.raw_header, item.id, item.description, item.transcript_id, item.cds_id];
        return candidates.some(val => typeof val === 'string' && val.toLowerCase().includes(query));
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingCDS.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No CDS found with ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different CDS ID (e.g., EIN_000210-t26_1)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingCDS.length}</strong> CDS sequence(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching CDS using the appropriate renderer
        matchingCDS.forEach(item => {
            const card = item.header ? createInvadensCDSCard(item) : createHistolyticaCDSCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`CDS search for "${query}" found ${matchingCDS.length} results`);
}

function performCodonUsageSearch() {
    const searchInput = document.getElementById('codonUsageSearchInput');
    const query = searchInput.value.trim().toUpperCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Codon to search');
        return;
    }
    
    if (currentCodonUsageData.length === 0) {
        alert('No codon usage data loaded. Please click on Codon usage first.');
        return;
    }
    
    // Search for matching codons
    const matchingCodons = currentCodonUsageData.filter(item => {
        return item.CODON && item.CODON.toUpperCase().includes(query);
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingCodons.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No codon found containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different codon (e.g., UAA, GCU, AUG)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingCodons.length}</strong> codon(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching codons
        matchingCodons.forEach(item => {
            const card = createInvadensCodonUsageCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Codon usage search for "${query}" found ${matchingCodons.length} results`);
}

function performGeneAliasesSearch() {
    const searchInput = document.getElementById('geneAliasesSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Gene ID to search');
        return;
    }
    
    if (currentGeneAliasesData.length === 0) {
        alert('No gene aliases data loaded. Please click on Gene aliases first.');
        return;
    }
    
    // Search for matching gene IDs in aliases
    const matchingAliases = currentGeneAliasesData.filter((item, index) => {
        try {
            const keyMatch = Object.keys(item).some(key => key.toLowerCase().includes(query));
            const valueMatch = Object.values(item).some(value => {
                if (Array.isArray(value)) return value.join(' ').toLowerCase().includes(query);
                return String(value).toLowerCase().includes(query);
            });
            return keyMatch || valueMatch;
        } catch (e) {
            return false;
        }
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    // Hide the homepage gallery when showing search results
    hideHomeGallery();
    resultsContainer.innerHTML = '';
    
    if (matchingAliases.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No gene aliases found containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Gene ID (e.g., EIN_059730)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingAliases.length}</strong> gene alias set(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching aliases
        matchingAliases.forEach((item, index) => {
            const card = createInvadensGeneAliasesCard(item, index);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Gene aliases search for "${query}" found ${matchingAliases.length} results`);
}

function performFullGFFSearch() {
    const searchInput = document.getElementById('fullGFFSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Sequence ID to search');
        return;
    }
    
    if (currentFullGFFData.length === 0) {
        alert('No Full GFF data loaded. Please click on Full GFF first.');
        return;
    }
    
    // Search for matching sequence IDs
    const matchingGFF = currentFullGFFData.filter(item => {
        return item.seqid && item.seqid.toLowerCase().includes(query);
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    resultsContainer.innerHTML = '';
    
    if (matchingGFF.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No GFF features found with sequence ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Sequence ID (e.g., KB207260)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingGFF.length}</strong> GFF feature(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching GFF features using the tolerant full-GFF renderer
        matchingGFF.forEach(item => {
            const card = createFullGFFCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`Full GFF search for "${query}" found ${matchingGFF.length} results`);
}

function performORFSearch() {
    const searchInput = document.getElementById('orfSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!query) {
        alert('Please enter a Sequence ID to search');
        return;
    }
    
    if (currentORFData.length === 0) {
        alert('No ORF data loaded. Please click on ORF first.');
        return;
    }
    
    // Search for matching sequence IDs
    const matchingORF = currentORFData.filter(item => {
        return item.seqid && item.seqid.toLowerCase().includes(query);
    });
    
    // Display results
    // Ensure back button visible so user can return to overview
    showBackButton();
    resultsContainer.innerHTML = '';
    
    if (matchingORF.length === 0) {
        resultsContainer.innerHTML = `
            <div class="info-card" style="border-left: 4px solid orange;">
                <h4>No Results Found</h4>
                <p>No ORF found with sequence ID containing "<strong>${searchInput.value}</strong>"</p>
                <p>Try searching with a different Sequence ID (e.g., KB206125)</p>
            </div>
        `;
    } else {
        // Add a header showing search results
        const headerDiv = document.createElement('div');
        headerDiv.className = 'info-card';
        headerDiv.style.backgroundColor = '#e8f5e8';
        headerDiv.style.borderLeft = '4px solid #28a745';
        headerDiv.innerHTML = `
            <h4>Search Results</h4>
            <p>Found <strong>${matchingORF.length}</strong> ORF(s) matching "<strong>${searchInput.value}</strong>"</p>
        `;
        resultsContainer.appendChild(headerDiv);
        
        // Display matching ORFs
        matchingORF.forEach(item => {
            const card = createInvadensORFCard(item);
            resultsContainer.appendChild(card);
        });
    }
    
    console.log(`ORF search for "${query}" found ${matchingORF.length} results`);
}

// Global search across multiple datasets (navbar search)
async function performGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const query = input ? input.value.trim() : '';
    const resultsContainer = document.getElementById('resultsContainer');

    if (!query) {
        alert('Please enter an ID or query to search');
        return;
    }

    // Show back button when global search is started so user can return home
    showBackButton();

    // Hide the homepage gallery during global search results
    hideHomeGallery();

    resultsContainer.innerHTML = `<h2>Searching for "${query}"...</h2>`;
    const qLower = query.toLowerCase();

    // List of endpoints to search (both organisms)
        const endpoints = [
        { org: 'histolytica', type: 'protein', url: 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json' },
        { org: 'histolytica', type: 'transcriptomics', url: 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedTranscripts.json' },
        { org: 'histolytica', type: 'cds', url: 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedCDSs.json' },
        { org: 'histolytica', type: 'genome', url: 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_Genome.json' },
        { org: 'histolytica', type: 'full-gff', url: 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS.json' },

        { org: 'invadens', type: 'protein', url: 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedProteins.json' },
        { org: 'invadens', type: 'transcriptomics', url: 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedTranscripts.json' },
        { org: 'invadens', type: 'cds', url: 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedCDSs.json' },
        { org: 'invadens', type: 'genome', url: 'Data/Entamoeba%20Invadens/EinvadensIP1_Genome.json' },
        { org: 'invadens', type: 'full-gff', url: 'Data/Entamoeba%20Invadens/AmoebaDB-68_EinvadensIP1.json' }
    ];

    try {
        const fetches = endpoints.map(ep => fetch(ep.url).then(r => ({ ep, r })).catch(err => ({ ep, err })));
        const responses = await Promise.all(fetches);

        const groupedMatches = {};
        let totalMatches = 0;

        // Helper to normalize loaded JSON arrays similar to loadData()
        function normalizeLoadedData(obj) {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj.records)) return obj.records;
            if (Array.isArray(obj.features)) return obj.features;
            if (Array.isArray(obj.data)) return obj.data;
            for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) return obj[key];
            }
            return [];
        }

        for (const respObj of responses) {
            const { ep } = respObj;
            if (respObj.err) {
                console.warn('Failed to fetch', ep.url, respObj.err);
                continue;
            }
            const r = respObj.r;
            if (!r || !r.ok) {
                console.warn('Skipping', ep.url, 'status', r && r.status);
                continue;
            }
            const raw = await r.json();
            const data = normalizeLoadedData(raw);

            // Search by presence of query in any serialized field (broad but effective)
            const matches = data.filter(item => {
                try {
                    return JSON.stringify(item).toLowerCase().includes(qLower);
                } catch (e) {
                    return false;
                }
            });

            if (matches.length > 0) {
                groupedMatches[`${ep.org}__${ep.type}`] = groupedMatches[`${ep.org}__${ep.type}`] || { org: ep.org, type: ep.type, items: [] };
                groupedMatches[`${ep.org}__${ep.type}`].items.push(...matches);
                totalMatches += matches.length;
            }
        }

        // Render results
        resultsContainer.innerHTML = '';
        const summaryCard = document.createElement('div');
        summaryCard.className = 'info-card';
        summaryCard.innerHTML = `<h4>Global Search Results</h4><p>Found <strong>${totalMatches}</strong> matching item(s) for "<strong>${query}</strong>"</p>`;
        resultsContainer.appendChild(summaryCard);

        if (totalMatches === 0) {
            const noCard = document.createElement('div');
            noCard.className = 'info-card';
            noCard.innerHTML = `<p>No results found for "<strong>${query}</strong>". Try a different ID or load a dataset from the sidebar first.</p>`;
            resultsContainer.appendChild(noCard);
            return;
        }

        // Aggregate matches per organism so we can offer a choice view for name-like queries
        const orgItems = { histolytica: [], invadens: [] };
        for (const key of Object.keys(groupedMatches)) {
            const group = groupedMatches[key];
            // keep type information with each item so we can render appropriate card later
            group.items.forEach(it => orgItems[group.org].push({ item: it, type: group.type }));
        }

        // Helper to create a card for a single item given the organism and (optional) reported type
        function createCardForItem(entry, org) {
            const item = entry.item || entry;
            const type = entry.type || '';
            try {
                if (type === 'protein' || item.protein_id || item.protein) {
                    return org === 'histolytica' ? createProteinCard(item) : createInvadensProteinCard(item);
                }
                if (type === 'transcriptomics' || item.transcript_id || item.transcript) {
                    return org === 'histolytica' ? createTranscriptCard(item) : createInvadensTranscriptCard(item);
                }
                if (type === 'cds' || item.cds_id || item.cds) {
                    return org === 'histolytica' ? createHistolyticaCDSCard(item) : createInvadensCDSCard(item);
                }
                if (type === 'genome' || item.sequence_id || item.seqid || item.accession) {
                    return org === 'histolytica' ? createGenomeCard(item) : createInvadensGenomeCard(item);
                }
                if (type === 'full-gff' || item.type || item.seqid) {
                    return createFullGFFCard(item);
                }
                // Fallback: generic representation
                const fallback = document.createElement('div');
                fallback.className = 'info-card';
                fallback.innerHTML = `<h4>Match</h4><pre class="sequence-data">${JSON.stringify(item, null, 2).slice(0, 1000)}</pre>`;
                return fallback;
            } catch (err) {
                console.error('Error creating card for item', err);
                return null;
            }
        }

        // If the query looks like a name (not an ID) and results exist in both organisms,
        // show two selector cards so the user can choose which organism's results to view.
        const queryIsId = isLikelyId(query);
        const histCount = orgItems.histolytica.length;
        const invCount = orgItems.invadens.length;

        if (!queryIsId && (histCount > 0 || invCount > 0)) {
            // Offer organism choice cards
            const choiceWrapper = document.createElement('div');
            choiceWrapper.className = 'info-card';
            choiceWrapper.innerHTML = `<h4>Choose organism to view</h4><p>Select which organism's matches to display for "<strong>${query}</strong>"</p>`;
            resultsContainer.appendChild(choiceWrapper);

            const choicesContainer = document.createElement('div');
            choicesContainer.style.display = 'flex';
            choicesContainer.style.gap = '12px';
            choicesContainer.style.marginTop = '8px';

            function makeOrgCard(orgLabel, orgKey, count) {
                const c = document.createElement('div');
                c.className = 'info-card';
                c.style.flex = '1';
                c.innerHTML = `<h4>${orgLabel}</h4><p>Found <strong>${count}</strong> matching item(s)</p><p><button class="org-view-btn">View ${orgLabel} results</button></p>`;
                const btn = c.querySelector('.org-view-btn');
                btn.addEventListener('click', () => {
                    // Render only this organism's items
                    resultsContainer.innerHTML = '';
                    const hdr = document.createElement('div');
                    hdr.className = 'info-card';
                    hdr.innerHTML = `<h4>${orgLabel} — Matches for "${query}"</h4><p>Found <strong>${count}</strong> item(s). <button id="backToOrgChoice">Back</button></p>`;
                    resultsContainer.appendChild(hdr);

                    // Back button to return to organism choice
                    const backBtn = document.getElementById('backToOrgChoice');
                    backBtn.addEventListener('click', () => {
                        // Re-render the choice UI
                        resultsContainer.innerHTML = '';
                        resultsContainer.appendChild(summaryCard);
                        resultsContainer.appendChild(choiceWrapper);
                        resultsContainer.appendChild(choicesContainer);
                    });

                    // Append cards for this organism
                    orgItems[orgKey].forEach(entry => {
                        const card = createCardForItem(entry, orgKey);
                        if (card) resultsContainer.appendChild(card);
                    });
                });
                return c;
            }

            if (histCount > 0) choicesContainer.appendChild(makeOrgCard('Entamoeba histolytica', 'histolytica', histCount));
            if (invCount > 0) choicesContainer.appendChild(makeOrgCard('Entamoeba invadens', 'invadens', invCount));

            // Append a 'Show all' option that expands all groupedMatches (original behavior)
            const showAllCard = document.createElement('div');
            showAllCard.className = 'info-card';
            showAllCard.style.flex = '1';
            showAllCard.innerHTML = `<h4>Show all matches</h4><p>Display all matches across organisms and types</p><p><button id="showAllMatchesBtn">Show all</button></p>`;
            showAllCard.querySelector('#showAllMatchesBtn').addEventListener('click', () => {
                // Render the original grouped view
                resultsContainer.innerHTML = '';
                resultsContainer.appendChild(summaryCard);
                for (const key of Object.keys(groupedMatches)) {
                    const group = groupedMatches[key];
                    const header = document.createElement('div');
                    header.className = 'info-card';
                    header.style.backgroundColor = '#eef6ff';
                    header.innerHTML = `<h4>${group.org === 'histolytica' ? 'Entamoeba histolytica' : 'Entamoeba invadens'} — ${group.type}</h4><p>Found <strong>${group.items.length}</strong> item(s)</p>`;
                    resultsContainer.appendChild(header);
                    group.items.forEach(item => {
                        let card = null;
                        try {
                            if (group.type === 'protein') {
                                card = group.org === 'histolytica' ? createProteinCard(item) : createInvadensProteinCard(item);
                            } else if (group.type === 'transcriptomics') {
                                card = group.org === 'histolytica' ? createTranscriptCard(item) : createInvadensTranscriptCard(item);
                            } else if (group.type === 'cds') {
                                card = group.org === 'histolytica' ? createHistolyticaCDSCard(item) : createInvadensCDSCard(item);
                            } else if (group.type === 'genome') {
                                card = group.org === 'histolytica' ? createGenomeCard(item) : createInvadensGenomeCard(item);
                            } else if (group.type === 'full-gff') {
                                card = createFullGFFCard(item);
                            } else {
                                card = document.createElement('div');
                                card.className = 'info-card';
                                card.innerHTML = `<h4>Match</h4><pre class="sequence-data">${JSON.stringify(item, null, 2).slice(0, 1000)}</pre>`;
                            }
                        } catch (err) {
                            console.error('Error creating card for item', err);
                        }
                        if (card) resultsContainer.appendChild(card);
                    });
                }
            });

            choicesContainer.appendChild(showAllCard);
            resultsContainer.appendChild(choiceWrapper);
            resultsContainer.appendChild(choicesContainer);
            return;
        }

        // Default: render groupedMatches as before (ID-like queries or when no organism choice needed)
        for (const key of Object.keys(groupedMatches)) {
            const group = groupedMatches[key];
            const header = document.createElement('div');
            header.className = 'info-card';
            header.style.backgroundColor = '#eef6ff';
            header.innerHTML = `<h4>${group.org === 'histolytica' ? 'Entamoeba histolytica' : 'Entamoeba invadens'} — ${group.type}</h4><p>Found <strong>${group.items.length}</strong> item(s)</p>`;
            resultsContainer.appendChild(header);

            group.items.forEach(item => {
                let card = null;
                try {
                    if (group.type === 'protein') {
                        card = group.org === 'histolytica' ? createProteinCard(item) : createInvadensProteinCard(item);
                    } else if (group.type === 'transcriptomics') {
                        card = group.org === 'histolytica' ? createTranscriptCard(item) : createInvadensTranscriptCard(item);
                    } else if (group.type === 'cds') {
                        card = group.org === 'histolytica' ? createHistolyticaCDSCard(item) : createInvadensCDSCard(item);
                    } else if (group.type === 'genome') {
                        card = group.org === 'histolytica' ? createGenomeCard(item) : createInvadensGenomeCard(item);
                    } else if (group.type === 'full-gff') {
                        // Prefer the tolerant full-GFF renderer for features
                        card = createFullGFFCard(item);
                    } else {
                        // Fallback: generic card
                        card = document.createElement('div');
                        card.className = 'info-card';
                        card.innerHTML = `<h4>Match</h4><pre class="sequence-data">${JSON.stringify(item, null, 2).slice(0, 1000)}</pre>`;
                    }
                } catch (err) {
                    console.error('Error creating card for item', err);
                }
                if (card) resultsContainer.appendChild(card);
            });
        }

    } catch (error) {
        console.error('Global search failed:', error);
        resultsContainer.innerHTML = `<div class="info-card" style="border-left:4px solid red;\"><h4>Error</h4><p>Global search failed: ${error.message}</p></div>`;
    }
}

// Back button functionality
function goBackToHome() {
    // Hide back button
    document.getElementById('backButtonContainer').style.display = 'none';
    
    // Hide all search bars
    hideAllSearchBars();
    
    // Remove active class from current button
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
        currentActiveButton = null;
    }
    
    // Reset to the saved initial home page content (captured on load)
    const resultsContainer = document.getElementById('resultsContainer');
    if (initialOverviewHTML && resultsContainer) {
        resultsContainer.innerHTML = initialOverviewHTML;
        // Restore homepage featured images when returning to the overview
        showHomeGallery();
    } else if (resultsContainer) {
        // Fallback: reload the page to restore initial state
        location.reload();
        return;
    }
    // Re-bind lab-link toggles and modal content links inside the restored HTML
    // (this duplicates the same small init used on DOMContentLoaded)
    const labLinks = document.querySelectorAll('.lab-link');
    labLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            const el = document.getElementById(targetId);
            if (!el) return;
            const isOpen = el.style.display === 'block';
            // close all sublists
            document.querySelectorAll('.lab-sublinks').forEach(s => s.style.display = 'none');
            el.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) this.scrollIntoView({behavior: 'smooth', block: 'center'});
        });
    });
    // Hide all sublists by default
    document.querySelectorAll('.lab-sublinks').forEach(s => s.style.display = 'none');

    // Re-wire any modal-opening links that use data-content (species, antigen, microscopy, treatment etc.)
    document.querySelectorAll('.lab-sublinks a[data-content]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const contentId = this.getAttribute('data-content');
            const source = document.getElementById(contentId);
            if (!source) return;
            const modal = document.getElementById('contentModal');
            const modalInner = document.getElementById('modalContent');
            modalInner.innerHTML = source.innerHTML;
            // wire any footer back-links inside the inserted content to close the modal
            modalInner.querySelectorAll('.back-link').forEach(bl => {
                bl.addEventListener('click', function(evt) {
                    evt.preventDefault();
                    modal.style.display = 'none';
                });
            });
            modal.style.display = 'flex';
            modalInner.focus();
        });
    });
    
    // Re-bind the standalone Basic Information and Images links (they were part of the
    // restored innerHTML and need their click handlers re-attached).
    const basicInfoLink = document.getElementById('basic-info-link');
    const imagesLink = document.getElementById('images-link');
    if (basicInfoLink) {
        basicInfoLink.addEventListener('click', function(e) {
            e.preventDefault();
            const source = document.getElementById('basic-info-content');
            if (!source) return;
            const modal = document.getElementById('contentModal');
            const modalInner = document.getElementById('modalContent');
            modalInner.innerHTML = source.innerHTML;
            // wire any footer back-links inside the inserted content to close the modal
            modalInner.querySelectorAll('.back-link').forEach(bl => {
                bl.addEventListener('click', function(evt) {
                    evt.preventDefault();
                    modal.style.display = 'none';
                });
            });
            modal.style.display = 'flex';
            modalInner.focus();
        });
    }
    if (imagesLink) {
        imagesLink.addEventListener('click', function(e) {
            e.preventDefault();
            const source = document.getElementById('images-content');
            if (!source) return;
            const modal = document.getElementById('contentModal');
            const modalInner = document.getElementById('modalContent');
            modalInner.innerHTML = source.innerHTML;
            modalInner.querySelectorAll('.back-link').forEach(bl => {
                bl.addEventListener('click', function(evt) {
                    evt.preventDefault();
                    modal.style.display = 'none';
                });
            });
            modal.style.display = 'flex';
            modalInner.focus();
        });
    }
    
    // Clear current data type
    currentDataType = '';
    
    console.log('Returned to home page');
}