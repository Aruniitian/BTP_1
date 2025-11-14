// Admin Panel JavaScript

// Admin credentials (In production, this should be handled server-side)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'amoeba2024'
};

// Current session state
let isLoggedIn = false;
let currentDataType = null;
let currentOrganism = null;
let currentData = [];

// DOM Elements
const loginModal = document.getElementById('loginModal');
const adminPanel = document.getElementById('adminPanel');
const adminDashboard = document.getElementById('adminDashboard');
const adminContent = document.getElementById('adminContent');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

function setupEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Data management buttons
    const dataButtons = document.querySelectorAll('.data-btn');
    dataButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const organism = this.getAttribute('data-organism');
            const type = this.getAttribute('data-type');
            loadDataManagement(organism, type);
            
            // Update active button
            dataButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Admin search functionality
    const adminSearchBtn = document.getElementById('adminSearchBtn');
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminClearSearchBtn = document.getElementById('adminClearSearchBtn');
    
    if (adminSearchBtn) {
        adminSearchBtn.addEventListener('click', performAdminSearch);
    }
    
    if (adminSearchInput) {
        adminSearchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                performAdminSearch();
            }
        });
    }
    
    if (adminClearSearchBtn) {
        adminClearSearchBtn.addEventListener('click', clearAdminSearch);
    }
}

// Helper: build auth headers for admin API calls
function getAdminAuthHeaders() {
    return {
        'Authorization': 'Bearer admin:amoeba2024',
        'Content-Type': 'application/json'
    };
}

function checkAuthStatus() {
    // Check if admin is already logged in (session storage)
    const adminSession = sessionStorage.getItem('adminLoggedIn');
    if (adminSession === 'true') {
        showAdminPanel();
    } else {
        showLoginModal();
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validate credentials
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        isLoggedIn = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        hideLoginError();
        showAdminPanel();
    } else {
        showLoginError('Invalid username or password');
    }
}

function handleLogout() {
    isLoggedIn = false;
    sessionStorage.removeItem('adminLoggedIn');
    showLoginModal();
    resetAdminPanel();
}

function showLoginModal() {
    loginModal.style.display = 'flex';
    adminPanel.style.display = 'none';
    adminDashboard.style.display = 'none';
    
    // Clear form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    hideLoginError();
}

function showAdminPanel() {
    loginModal.style.display = 'none';
    adminPanel.style.display = 'flex';
    adminDashboard.style.display = 'flex';
    showWelcomeScreen();
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function hideLoginError() {
    loginError.style.display = 'none';
}

function resetAdminPanel() {
    currentDataType = null;
    currentOrganism = null;
    currentData = [];
    showWelcomeScreen();
    
    // Remove active states
    document.querySelectorAll('.data-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function showWelcomeScreen() {
    adminContent.innerHTML = `
        <div class="welcome-section">
            <h2>Welcome to Admin Panel</h2>
            <p>Select a data type from the sidebar to manage the data.</p>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Datasets</h3>
                        <span id="totalDatasets">15</span>
                </div>
                <div class="stat-card">
                    <h3>Histolytica Files</h3>
                        <span id="histolyticaFiles">8</span>
                </div>
                <div class="stat-card">
                    <h3>Invadens Files</h3>
                    <span id="invadensFiles">7</span>
                </div>
            </div>
        </div>
    `;
}

async function loadDataManagement(organism, dataType) {
    currentOrganism = organism;
    currentDataType = dataType;
    
    // Show loading
    adminContent.innerHTML = '<div class="loading">Loading data...</div>';
    
    try {
        // Load data via admin API so we can authenticate and get server-provided structure
        const apiUrl = `/admin/api/data/${organism}/${dataType}`;
        const response = await fetch(apiUrl, { headers: getAdminAuthHeaders() });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to load data: ${response.status} ${text}`);
        }
        
        const rawResp = await response.json();
        // server returns { success: true, data: <...>, count, filePath }
    const raw = rawResp && rawResp.data ? rawResp.data : rawResp;
        // Normalize common container structures (records, features, data)
        const data = (function normalizeLoadedData(obj) {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj.records)) return obj.records;
            if (Array.isArray(obj.features)) return obj.features;
            if (Array.isArray(obj.data)) return obj.data;
            for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) return obj[key];
            }
            return [];
        })(raw);
        // Special-case: some codon-usage files are exported as a 2D array
        // where the first row is header names (e.g. ["CODON","AA","FREQ","ABUNDANCE"]) and
        // subsequent rows are arrays of values. Convert those to objects so the admin UI
        // can consume { CODON, AA, FREQ, ABUNDANCE } as expected.
        let normalizedData = data;
        if (currentOrganism === 'histolytica' && currentDataType === 'codon-usage' && Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
            const headerRow = data[0].map(h => String(h).trim());
            const mapped = data.slice(1).map(row => {
                const obj = {};
                for (let i = 0; i < headerRow.length; i++) {
                    const key = headerRow[i] || `col${i}`;
                    const val = row && row[i] !== undefined ? String(row[i]).trim() : null;
                    obj[key] = val;
                }
                return obj;
            });
            normalizedData = mapped;
            console.log('Admin: Converted codon-usage 2D-array to objects, items count:', mapped.length);
        }
    currentData = normalizedData;

    // Display data management interface (use the normalized data if we converted it)
    displayDataManagement(organism, dataType, normalizedData);
        
    } catch (error) {
        console.error('Error loading data:', error);
        adminContent.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Data</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function getDataEndpoint(organism, dataType) {
    if (organism === 'histolytica') {
        switch (dataType) {
            case 'transcriptomics':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedTranscripts.json';
            case 'protein':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json';
            case 'cds':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedCDSs.json';
            case 'codon-usage':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_CodonUsage.json';
            case 'orf50':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_Orf50.json';
            case 'genome':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_Genome.json';
            case 'full-gff':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS.json';
            case 'gene-aliases':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json';
            case 'curated-go':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_Curated_GO.gaf.json';
            case 'go-gaf':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_GO.gaf.json';
            case 'ncbi-linkout-nucleotide':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Nucleotide.json';
            case 'ncbi-linkout-protein':
                return 'Data/Entamoeba%20Histolytica/AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Protein.json';
        }
    } else if (organism === 'invadens') {
        switch (dataType) {
            case 'transcriptomics':
                return 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedTranscripts.json';
            case 'protein':
                return 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedProteins.json';
            case 'cds':
                return 'Data/Entamoeba%20Invadens/EinvadensIP1_AnnotatedCDSs.json';
            case 'genome':
                return 'Data/Entamoeba%20Invadens/EinvadensIP1_Genome.json';
            case 'codon-usage':
                return 'Data/Entamoeba%20Invadens/EinvadensIP1_CodonUsage.json';
            case 'gene-aliases':
                return 'Data/Entamoeba%20Invadens/EinvadensIP1_GeneAliases.json';
            case 'full-gff':
                return 'Data/Entamoeba%20Invadens/AmoebaDB-68_EinvadensIP1.json';
        }
    }
    throw new Error('Unknown organism or data type');
}

function displayDataManagement(organism, dataType, data) {
    const organismName = organism === 'histolytica' ? 'Entamoeba Histolytica' : 'Entamoeba Invadens';
    const dataTypeName = formatDataTypeName(dataType);
    
    adminContent.innerHTML = `
        <div class="data-management">
            <div class="data-header">
                <h2>${organismName} - ${dataTypeName}</h2>
                <div class="data-actions">
                    <button class="action-btn back-btn" onclick="adminGoBackHome()">← Back</button>
                    <button class="action-btn add-btn" onclick="showAddForm()">Add Entry</button>
                    <button class="action-btn export-btn" onclick="exportData()">Export</button>
                    <button class="action-btn backup-btn" onclick="createBackup()">Backup</button>
                </div>
            </div>
            <div class="data-content">
                <p><strong>Total Entries:</strong> ${data.length}</p>
                <div id="dataTableContainer">
                    ${generateDataTable(data, dataType)}
                </div>
            </div>
        </div>
        <div id="formContainer"></div>
    `;
}

function formatDataTypeName(dataType) {
    const names = {
        'transcriptomics': 'transcripts',
        'protein': 'Protein Sequence',
        'gene': 'Gene Data',
        'genome': 'Genome Data',
        'cds': 'CDS Data',
        'codon-usage': 'Codon Usage',
        'orf50': 'ORF50 Data',
        'gene-aliases': 'Gene Aliases',
        'full-gff': 'Full GFF'
    };
    return names[dataType] || dataType;
}

function generateDataTable(data, dataType) {
    if (!data || data.length === 0) {
        return '<p>No data available.</p>';
    }
    
    // Get first few entries to display (limit for performance)
    const displayData = data.slice(0, 50);
    const hasMore = data.length > 50;
    
    // Generate table based on data type
    let tableHTML = '<table class="data-table"><thead><tr>';
    
    // Get column headers based on data type
    const columns = getTableColumns(dataType, data[0]);
    columns.forEach(col => {
        tableHTML += `<th>${col.header}</th>`;
    });
    tableHTML += '<th>Actions</th></tr></thead><tbody>';
    
    // Generate rows
    displayData.forEach((item, index) => {
        tableHTML += '<tr>';
        columns.forEach(col => {
            const value = getNestedValue(item, col.key);
            let displayValue = truncateText(value, 50);
            let titleValue = value;

            // For sequence-like header columns, format to show ID and gene only
            if (col.header && col.header.toLowerCase() === 'header' && (currentDataType === 'transcriptomics' || currentDataType === 'protein' || currentDataType === 'cds')) {
                // formatSequenceHeaderForDisplay will remove leading '>' and produce a compact label
                const pretty = formatSequenceHeaderForDisplay(value);
                displayValue = pretty;
                // keep the full original header (without leading >) in the tooltip
                titleValue = (typeof value === 'string' && value.startsWith('>')) ? value.slice(1).trim() : value;
            }

            tableHTML += `<td title="${escapeHtml(titleValue)}">${escapeHtml(displayValue)}</td>`;
        });
        tableHTML += `
            <td>
                <button class="edit-btn" onclick="editEntry(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteEntry(${index})">Delete</button>
            </td>
        </tr>`;
    });
    
    tableHTML += '</tbody></table>';
    
    if (hasMore) {
        tableHTML += `<p><em>Showing first 50 entries out of ${data.length} total entries.</em></p>`;
    }
    
    return tableHTML;
}

function getTableColumns(dataType, sampleData) {
    // Define columns for different data types
    const columnMaps = {
        'transcriptomics': [
            { key: 'transcript_id', header: 'Transcript ID' },
            { key: 'gene_id', header: 'Gene ID' },
            { key: 'length', header: 'Length' },
            { key: 'sequence_SO', header: 'Sequence SO' }
        ],
        'protein': [
            { key: 'protein_id', header: 'Protein ID' },
            { key: 'gene_id', header: 'Gene ID' },
            { key: 'gene_product', header: 'Product' },
            { key: 'protein_length', header: 'Length' }
        ],
        'gene': [
            { key: '_id', header: 'Gene ID' },
            { key: 'gene_name', header: 'Gene Name' },
            { key: 'gene_type', header: 'Type' },
            { key: 'species', header: 'Species' }
        ],
        'genome': [
            { key: 'sequence_id', header: 'Sequence ID' },
            { key: 'organism', header: 'Organism' },
            { key: 'length', header: 'Length' },
            { key: 'type', header: 'Type' }
        ]
    };
    
    // Handle some specific structured data types (codon usage and sequence entries)
    if (dataType === 'transcriptomics' || dataType === 'protein' || dataType === 'cds') {
        // Many sequence-like files use header/sequence fields. Use arrays of candidate keys
        // so getNestedValue can try fallbacks like raw_header, id, attributes.description.
        let headerKeyCandidates = ['raw_header', 'id', 'header', 'attributes.description', 'attributes.gene', 'attributes.gene_product'];
        let seqKeyCandidates = ['sequence', 'compressed_sequence', 'attributes.sequence'];

        if (sampleData) {
            // Promote any explicit property to the front if present
            const promote = (arr, prop) => {
                const idx = arr.indexOf(prop);
                if (idx > 0) {
                    arr.splice(idx, 1);
                    arr.unshift(prop);
                }
            };

            if (sampleData.raw_header) promote(headerKeyCandidates, 'raw_header');
            if (sampleData.id) promote(headerKeyCandidates, 'id');
            if (sampleData.header) promote(headerKeyCandidates, 'header');
            if (sampleData.attributes && sampleData.attributes.description) promote(headerKeyCandidates, 'attributes.description');

            if (sampleData.sequence) promote(seqKeyCandidates, 'sequence');
            if (sampleData.compressed_sequence) promote(seqKeyCandidates, 'compressed_sequence');
        }

        return [
            { key: headerKeyCandidates, header: 'Header' },
            { key: seqKeyCandidates, header: 'Sequence (truncated)' }
        ];
    } else if (dataType === 'codon-usage') {
        return [
            { key: 'CODON', header: 'Codon' },
            { key: 'AA', header: 'Amino Acid' },
            { key: 'FREQ', header: 'Frequency' },
            { key: 'ABUNDANCE', header: 'Abundance' }
        ];
    } else if (dataType === 'full-gff') {
        return [
            { key: 'seqid', header: 'Sequence ID' },
            { key: 'source', header: 'Source' },
            { key: 'type', header: 'Type' },
            { key: 'start', header: 'Start' },
            { key: 'end', header: 'End' }
        ];
    }
    
    return columnMaps[dataType] || [
        { key: Object.keys(sampleData)[0], header: 'ID' },
        { key: Object.keys(sampleData)[1], header: 'Data' }
    ];
}

function getNestedValue(obj, key) {
    if (!obj) return 'N/A';

    // Allow key to be an array of candidate keys
    if (Array.isArray(key)) {
        for (const k of key) {
            const val = getNestedValue(obj, k);
            if (val !== 'N/A') return val;
        }
        return 'N/A';
    }

    const parts = String(key).split('.');
    let val = obj;
    for (const p of parts) {
        if (val && Object.prototype.hasOwnProperty.call(val, p)) {
            val = val[p];
        } else {
            return 'N/A';
        }
    }
    return (val === null || val === undefined) ? 'N/A' : val;
}

function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    const str = String(text);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format a sequence header string for admin table display.
 * - removes any leading '>'
 * - extracts primary ID and gene=... token (if present)
 * - returns a compact label like: "EHI_151170A — Gene: EHI_151170"
 */
function formatSequenceHeaderForDisplay(rawHeader) {
    if (!rawHeader || rawHeader === 'N/A') return 'N/A';
    let header = String(rawHeader).trim();
    // remove leading > if present
    if (header.startsWith('>')) header = header.slice(1).trim();

    // split on pipe separators to find id and gene token
    const parts = header.split('|').map(p => p.trim());
    let idPart = parts.length > 0 ? parts[0] : header;
    // if idPart contains spaces, take the first token
    idPart = idPart.split(/\s+/)[0];

    // find gene token like gene=EHI_151170
    let geneMatch = header.match(/\bgene=([^\s|;]+)/i);
    let gene = geneMatch ? geneMatch[1] : null;

    if (gene) {
        return `${idPart} — Gene: ${gene}`;
    }

    // fallback: if header contains 'transcript=' or 'protein=' fields
    const altGene = header.match(/\b(transcript|protein)=([^\s|;]+)/i);
    if (altGene) return `${idPart} — ${altGene[1]}: ${altGene[2]}`;

    // otherwise return the idPart only
    return idPart;
}

// CRUD Operations
function showAddForm() {
    const formContainer = document.getElementById('formContainer');
    const form = generateEntryForm();
    formContainer.innerHTML = form;
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

function editEntry(index) {
    const entry = currentData[index];
    const formContainer = document.getElementById('formContainer');
    const form = generateEntryForm(entry, index);
    formContainer.innerHTML = form;
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

function deleteEntry(index) {
    if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        // Call server API to delete the entry so change is persisted
        (async () => {
            try {
                const apiUrl = `/admin/api/data/${currentOrganism}/${currentDataType}/entry/${index}`;
                const resp = await fetch(apiUrl, {
                    method: 'DELETE',
                    headers: getAdminAuthHeaders()
                });
                if (!resp.ok) {
                    const text = await resp.text();
                    throw new Error(`Delete failed: ${resp.status} ${text}`);
                }

                const json = await resp.json();
                if (!json || !json.success) {
                    throw new Error(json && json.message ? json.message : 'Unknown server error');
                }

                // Reload data from server to reflect canonical state
                await loadDataManagement(currentOrganism, currentDataType);
                showSuccessMessage('Entry deleted successfully!');
            } catch (err) {
                console.error('Error deleting entry:', err);
                alert('Failed to delete entry: ' + err.message);
            }
        })();
    }
}

function generateEntryForm(entry = null, index = null) {
    const isEdit = entry !== null;
    const title = isEdit ? 'Edit Entry' : 'Add New Entry';
    
    let formFields = '';
    
    // Generate form fields based on data type
    // For Entamoeba Histolytica (AmoebaDB JSON shapes) prefer a sample-driven generic form
    if (currentOrganism !== 'histolytica' && currentDataType === 'transcriptomics') {
        formFields = `
            <div class="form-row">
                <div>
                    <label for="transcript_id">Transcript ID:</label>
                    <input type="text" id="transcript_id" name="transcript_id" value="${entry?.transcript_id || ''}" required>
                </div>
                <div>
                    <label for="gene_id">Gene ID:</label>
                    <input type="text" id="gene_id" name="gene_id" value="${entry?.gene_id || ''}">
                </div>
            </div>
            <div class="form-row">
                <div>
                    <label for="length">Length:</label>
                    <input type="number" id="length" name="length" value="${entry?.length || ''}">
                </div>
                <div>
                    <label for="sequence_SO">Sequence SO:</label>
                    <input type="text" id="sequence_SO" name="sequence_SO" value="${entry?.sequence_SO || ''}">
                </div>
            </div>
            <div class="form-row full-width">
                <div>
                    <label for="compressed_sequence">Compressed Sequence:</label>
                    <textarea id="compressed_sequence" name="compressed_sequence">${entry?.compressed_sequence || ''}</textarea>
                </div>
            </div>
        `;
    } else if (currentOrganism !== 'histolytica' && currentDataType === 'protein') {
        formFields = `
            <div class="form-row">
                <div>
                    <label for="protein_id">Protein ID:</label>
                    <input type="text" id="protein_id" name="protein_id" value="${entry?.protein_id || ''}" required>
                </div>
                <div>
                    <label for="gene_id">Gene ID:</label>
                    <input type="text" id="gene_id" name="gene_id" value="${entry?.gene_id || ''}">
                </div>
            </div>
            <div class="form-row">
                <div>
                    <label for="gene_product">Gene Product:</label>
                    <input type="text" id="gene_product" name="gene_product" value="${entry?.gene_product || ''}">
                </div>
                <div>
                    <label for="protein_length">Protein Length:</label>
                    <input type="number" id="protein_length" name="protein_length" value="${entry?.protein_length || ''}">
                </div>
            </div>
            <div class="form-row full-width">
                <div>
                    <label for="compressed_sequence">Compressed Sequence:</label>
                    <textarea id="compressed_sequence" name="compressed_sequence">${entry?.compressed_sequence || ''}</textarea>
                </div>
            </div>
        `;
    } else {
        // Generic form for other data types
        const sampleData = entry || currentData[0] || {};
        const keys = Object.keys(sampleData);
        
        formFields = keys.map(key => {
            const value = entry ? entry[key] : '';
            const isLongText = typeof value === 'string' && value.length > 100;
            
            return `
                <div class="form-row ${isLongText ? 'full-width' : ''}">
                    <div>
                        <label for="${key}">${key.replace(/_/g, ' ').toUpperCase()}:</label>
                        ${isLongText ? 
                            `<textarea id="${key}" name="${key}">${value}</textarea>` :
                            `<input type="text" id="${key}" name="${key}" value="${value}">`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }
    
    return `
        <div class="admin-form">
            <h3>${title}</h3>
            <form id="entryForm" onsubmit="saveEntry(event, ${index})">
                ${formFields}
                <div class="form-actions">
                    <button type="submit" class="save-btn">Save</button>
                    <button type="button" class="cancel-btn" onclick="cancelForm()">Cancel</button>
                </div>
            </form>
        </div>
    `;
}

function saveEntry(event, index = null) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const entryData = {};
    
    // Convert form data to object
    for (let [key, value] of formData.entries()) {
        // Try to parse numbers
        if (!isNaN(value) && value !== '') {
            entryData[key] = Number(value);
        } else {
            entryData[key] = value;
        }
    }
    
    // Create backup before modification
    // Persist change to server (this will create a server-side backup)
    (async () => {
        try {
            const baseUrl = `/admin/api/data/${currentOrganism}/${currentDataType}`;
            let resp;

            if (index !== null) {
                // Edit existing entry
                resp = await fetch(`${baseUrl}/entry/${index}`, {
                    method: 'PUT',
                    headers: getAdminAuthHeaders(),
                    body: JSON.stringify({ entry: entryData })
                });
            } else {
                // Add new entry
                resp = await fetch(`${baseUrl}/entry`, {
                    method: 'POST',
                    headers: getAdminAuthHeaders(),
                    body: JSON.stringify({ entry: entryData })
                });
            }

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`Save failed: ${resp.status} ${text}`);
            }

            const json = await resp.json();
            if (!json || !json.success) {
                throw new Error(json && json.message ? json.message : 'Unknown server error');
            }

            // Reload current data so the UI shows the canonical server state
            await loadDataManagement(currentOrganism, currentDataType);
            showSuccessMessage(index !== null ? 'Entry updated successfully!' : 'Entry added successfully!');
            // Clear form
            cancelForm();
        } catch (err) {
            console.error('Error saving entry:', err);
            alert('Failed to save entry: ' + err.message);
        }
    })();
}

function cancelForm() {
    document.getElementById('formContainer').innerHTML = '';
}

// Return to admin panel home (welcome screen) from a data view
function adminGoBackHome() {
    // clear current data and UI state
    currentData = [];
    currentDataType = null;
    currentOrganism = null;

    // remove active states in sidebar
    document.querySelectorAll('.data-btn').forEach(btn => btn.classList.remove('active'));

    // show welcome screen (re-uses showWelcomeScreen)
    showWelcomeScreen();

    // scroll to top of admin content
    const adminMain = document.querySelector('.admin-main');
    if (adminMain) adminMain.scrollIntoView({ behavior: 'smooth' });
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const dataContent = document.querySelector('.data-content');
    dataContent.insertBefore(successDiv, dataContent.firstChild);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Utility Functions
function exportData() {
    const dataStr = JSON.stringify(currentData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${currentOrganism}_${currentDataType}_export.json`;
    link.click();
    
    showSuccessMessage('Data exported successfully!');
}

function createBackup() {
    // Trigger a server-side backup by sending a PUT of the current data (no-op content change)
    (async () => {
        try {
            const apiUrl = `/admin/api/data/${currentOrganism}/${currentDataType}`;
            const resp = await fetch(apiUrl, {
                method: 'PUT',
                headers: getAdminAuthHeaders(),
                body: JSON.stringify({ data: currentData })
            });
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`Backup failed: ${resp.status} ${text}`);
            }

            const json = await resp.json();
            if (!json || !json.success) {
                throw new Error(json && json.message ? json.message : 'Unknown server error');
            }

            showSuccessMessage('Server backup created successfully!');
        } catch (err) {
            console.error('Error creating server backup:', err);
            alert('Failed to create backup: ' + err.message);
        }
    })();
}

// Admin Search Functions
function performAdminSearch() {
    const searchInput = document.getElementById('adminSearchInput');
    const query = searchInput.value.trim().toLowerCase();
    const clearBtn = document.getElementById('adminClearSearchBtn');
    
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    
    if (!currentData || currentData.length === 0) {
        alert('No data loaded. Please select a data type first.');
        return;
    }
    
    // Search through current data based on data type
    let searchResults = [];
    
    if (currentDataType === 'transcriptomics') {
        if (currentOrganism === 'histolytica') {
            searchResults = currentData.filter(item => 
                (item.transcript_id && item.transcript_id.toLowerCase().includes(query)) ||
                (item.gene_id && item.gene_id.toLowerCase().includes(query))
            );
        } else {
            searchResults = currentData.filter(item => 
                (item.header && item.header.toLowerCase().includes(query))
            );
        }
    } else if (currentDataType === 'protein') {
        if (currentOrganism === 'histolytica') {
            searchResults = currentData.filter(item => 
                (item.protein_id && item.protein_id.toLowerCase().includes(query)) ||
                (item.gene_id && item.gene_id.toLowerCase().includes(query))
            );
        } else {
            searchResults = currentData.filter(item => 
                (item.header && item.header.toLowerCase().includes(query))
            );
        }
    } else if (currentDataType === 'gene') {
        searchResults = currentData.filter(item => 
            (item._id && item._id.toLowerCase().includes(query)) ||
            (item.gene_name && item.gene_name.toLowerCase().includes(query))
        );
    } else if (currentDataType === 'genome') {
        if (currentOrganism === 'histolytica') {
            searchResults = currentData.filter(item => 
                (item.sequence_id && item.sequence_id.toLowerCase().includes(query))
            );
        } else {
            searchResults = currentData.filter(item => 
                (item.header && item.header.toLowerCase().includes(query))
            );
        }
    } else if (currentDataType === 'cds') {
        searchResults = currentData.filter(item => 
            (item.header && item.header.toLowerCase().includes(query))
        );
    } else if (currentDataType === 'codon-usage') {
        searchResults = currentData.filter(item => 
            (item.CODON && item.CODON.toLowerCase().includes(query)) ||
            (item.AA && item.AA.toLowerCase().includes(query))
        );
    } else if (currentDataType === 'gene-aliases') {
        searchResults = currentData.filter(item => {
            const itemStr = JSON.stringify(item).toLowerCase();
            return itemStr.includes(query);
        });
    } else if (currentDataType === 'full-gff') {
        searchResults = currentData.filter(item => 
            (item.seqid && item.seqid.toLowerCase().includes(query)) ||
            (item.type && item.type.toLowerCase().includes(query))
        );
    }
    
    // Display search results
    displaySearchResults(searchResults, query);
    
    // Show clear button
    clearBtn.style.display = 'inline-block';
}

function displaySearchResults(results, query) {
    const organismName = currentOrganism === 'histolytica' ? 'Entamoeba Histolytica' : 'Entamoeba Invadens';
    const dataTypeName = formatDataTypeName(currentDataType);
    
    adminContent.innerHTML = `
        <div class="data-management">
            <div class="data-header">
                <h2>${organismName} - ${dataTypeName} (Search Results)</h2>
                <div class="data-actions">
                    <button class="action-btn add-btn" onclick="showAddForm()">Add Entry</button>
                    <button class="action-btn export-btn" onclick="exportData()">Export</button>
                    <button class="action-btn backup-btn" onclick="createBackup()">Backup</button>
                </div>
            </div>
            <div class="data-content">
                <div class="search-results-header">
                    <p><strong>Search Results for "${query}":</strong> ${results.length} entries found out of ${currentData.length} total</p>
                </div>
                <div id="dataTableContainer">
                    ${generateDataTable(results, currentDataType)}
                </div>
            </div>
        </div>
        <div id="formContainer"></div>
    `;
}

function clearAdminSearch() {
    const searchInput = document.getElementById('adminSearchInput');
    const clearBtn = document.getElementById('adminClearSearchBtn');
    
    // Clear search input
    searchInput.value = '';
    
    // Hide clear button
    clearBtn.style.display = 'none';
    
    // Reload original data
    if (currentOrganism && currentDataType) {
        displayDataManagement(currentOrganism, currentDataType, currentData);
    }
}

// Warning message for data modifications
window.addEventListener('beforeunload', function(e) {
    if (currentData && currentData.length > 0) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
    }
});
