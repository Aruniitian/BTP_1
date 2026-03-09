// Admin Panel JavaScript

// Fix #1, #8: Credentials are now validated server-side only.
// No credentials stored in client-side code.

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
    
    // Sidebar toggle (collapsible)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const dashSidebar = document.getElementById('dashSidebar');
    if (sidebarToggle && dashSidebar) {
        // Restore collapsed state from localStorage
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            dashSidebar.classList.add('collapsed');
        }
        sidebarToggle.addEventListener('click', () => {
            dashSidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', dashSidebar.classList.contains('collapsed'));
        });
    }

    // Collapsible organism sections
    document.querySelectorAll('.sidebar-collapsible-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.toggle('open');
                toggle.classList.toggle('collapsed');
            }
        });
    });

    // Download Manager button
    const dlManagerBtn = document.getElementById('downloadManagerBtn');
    if (dlManagerBtn) {
        dlManagerBtn.addEventListener('click', () => {
            document.querySelectorAll('.data-btn').forEach(b => b.classList.remove('active'));
            dlManagerBtn.classList.add('active');
            showDownloadManager();
        });
    }

    // Data management buttons
    const dataButtons = document.querySelectorAll('.data-btn');
    dataButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const organism = this.getAttribute('data-organism');
            const type = this.getAttribute('data-type');
            loadDataManagement(organism, type);
            
            // Update active button
            dataButtons.forEach(b => b.classList.remove('active'));
            if (dlManagerBtn) dlManagerBtn.classList.remove('active');
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

// Helper: build auth headers using server-issued session token (Fix #8)
function getAdminAuthHeaders() {
    const token = sessionStorage.getItem('adminToken');
    return {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/json'
    };
}

async function checkAuthStatus() {
    // Fix #8: Validate session token with server instead of trusting client storage
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        showLoginModal();
        return;
    }
    try {
        const resp = await fetch('/admin/api/session', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
            showAdminPanel();
        } else {
            sessionStorage.removeItem('adminToken');
            showLoginModal();
        }
    } catch (err) {
        showLoginModal();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Fix #8: Validate credentials server-side via login API
    try {
        const resp = await fetch('/admin/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();
        
        if (resp.ok && data.success && data.token) {
            isLoggedIn = true;
            sessionStorage.setItem('adminToken', data.token);
            hideLoginError();
            showAdminPanel();
        } else {
            showLoginError(data.error || 'Invalid username or password');
        }
    } catch (err) {
        showLoginError('Login failed. Please check your connection.');
    }
}

async function handleLogout() {
    // Fix #8: Invalidate session on server
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        try {
            await fetch('/admin/api/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) { /* ignore logout errors */ }
    }
    isLoggedIn = false;
    sessionStorage.removeItem('adminToken');
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

// Alias for backward compatibility
const loginScreen = loginModal;

function showAdminPanel() {
    loginModal.style.display = 'none';
    adminDashboard.style.display = 'flex';
    adminPanel.style.display = 'flex';
    showWelcomeScreen();
    loadSidebarOrganisms();
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
            <div class="welcome-header">
                <div class="welcome-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2>Welcome to Admin Dashboard</h2>
                <p>Select a dataset from the sidebar to view, edit, or manage genomic records.</p>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon teal">🧫</div>
                    <h3>Organisms</h3>
                    <span id="welcomeOrganisms">—</span>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">📁</div>
                    <h3>Files on Disk</h3>
                    <span id="welcomeFiles">—</span>
                </div>
                <div class="stat-card">
                    <div class="stat-icon violet">💾</div>
                    <h3>Disk Usage</h3>
                    <span id="welcomeDisk">—</span>
                </div>
                <div class="stat-card">
                    <div class="stat-icon amber">📦</div>
                    <h3>Release</h3>
                    <span>68</span>
                </div>
            </div>
            <div style="margin-top:1.5rem">
                <h3 style="font-size:.85rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.6rem;">Quick Actions</h3>

                <!-- E. histolytica -->
                <div style="font-size:.72rem;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:.5px;margin:.9rem 0 .45rem;display:flex;align-items:center;gap:.4rem;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0d9488"></span>E. histolytica
                </div>
                <div class="quick-actions">
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','transcriptomics')">
                        <div class="qa-icon" style="background:#dbeafe;color:#1d4ed8;">📝</div>
                        <div><div class="qa-label">Transcripts</div><div class="qa-desc">Annotated transcripts</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','protein')">
                        <div class="qa-icon" style="background:#ede9fe;color:#6d28d9;">🧪</div>
                        <div><div class="qa-label">Proteins</div><div class="qa-desc">Protein sequences</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','cds')">
                        <div class="qa-icon" style="background:#fce7f3;color:#be185d;">🔬</div>
                        <div><div class="qa-label">CDS</div><div class="qa-desc">Coding sequences</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','genome')">
                        <div class="qa-icon" style="background:#d1fae5;color:#065f46;">🧬</div>
                        <div><div class="qa-label">Genome</div><div class="qa-desc">Genome sequences</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','codon-usage')">
                        <div class="qa-icon" style="background:#fef3c7;color:#92400e;">📊</div>
                        <div><div class="qa-label">Codon Usage</div><div class="qa-desc">Codon frequency table</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','gene-aliases')">
                        <div class="qa-icon" style="background:#fee2e2;color:#991b1b;">🏷️</div>
                        <div><div class="qa-label">Gene Aliases</div><div class="qa-desc">Gene name aliases</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','orf')">
                        <div class="qa-icon" style="background:#e0f2fe;color:#0369a1;">🔭</div>
                        <div><div class="qa-label">ORF</div><div class="qa-desc">Open reading frames</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('histolytica','full-gff')">
                        <div class="qa-icon" style="background:#f1f5f9;color:#334155;">📋</div>
                        <div><div class="qa-label">Full GFF</div><div class="qa-desc">Complete GFF annotation</div></div>
                    </div>
                </div>

                <!-- E. invadens -->
                <div style="font-size:.72rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.5px;margin:.9rem 0 .45rem;display:flex;align-items:center;gap:.4rem;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7c3aed"></span>E. invadens
                </div>
                <div class="quick-actions">
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','transcriptomics')">
                        <div class="qa-icon" style="background:#dbeafe;color:#1d4ed8;">📝</div>
                        <div><div class="qa-label">Transcripts</div><div class="qa-desc">Annotated transcripts</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','protein')">
                        <div class="qa-icon" style="background:#ede9fe;color:#6d28d9;">🧪</div>
                        <div><div class="qa-label">Proteins</div><div class="qa-desc">Protein sequences</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','cds')">
                        <div class="qa-icon" style="background:#fce7f3;color:#be185d;">🔬</div>
                        <div><div class="qa-label">CDS</div><div class="qa-desc">Coding sequences</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','genome')">
                        <div class="qa-icon" style="background:#d1fae5;color:#065f46;">🧬</div>
                        <div><div class="qa-label">Genome</div><div class="qa-desc">Genome sequences</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','codon-usage')">
                        <div class="qa-icon" style="background:#fef3c7;color:#92400e;">📊</div>
                        <div><div class="qa-label">Codon Usage</div><div class="qa-desc">Codon frequency table</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','gene-aliases')">
                        <div class="qa-icon" style="background:#fee2e2;color:#991b1b;">🏷️</div>
                        <div><div class="qa-label">Gene Aliases</div><div class="qa-desc">Gene name aliases</div></div>
                    </div>
                    <div class="quick-action-card" onclick="loadDataManagement('invadens','full-gff')">
                        <div class="qa-icon" style="background:#f1f5f9;color:#334155;">📋</div>
                        <div><div class="qa-label">Full GFF</div><div class="qa-desc">Complete GFF annotation</div></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Populate welcome stats from live /api/stats (no auth needed)
    fetch('/api/stats').then(r => r.json()).then(s => {
        if (!s.success) return;
        const fmtB = (b) => b > 1e9 ? (b/1e9).toFixed(1)+' GB' : b > 1e6 ? (b/1e6).toFixed(1)+' MB' : b > 1e3 ? (b/1e3).toFixed(1)+' KB' : b+' B';
        const el = (id) => document.getElementById(id);
        if (el('welcomeOrganisms')) el('welcomeOrganisms').textContent = s.download.organismsOnDisk;
        if (el('welcomeFiles'))     el('welcomeFiles').textContent     = s.download.filesOnDisk.toLocaleString();
        if (el('welcomeDisk'))      el('welcomeDisk').textContent      = fmtB(s.totalDiskUsage);
    }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNLOAD MANAGER
// ═══════════════════════════════════════════════════════════════════════════════
let dlPollTimer = null;
let dlCurrentFilter = 'all';

function fmtBytes(bytes) {
    if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
    if (bytes > 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
    return bytes + ' B';
}

function fmtElapsed(ms) {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hrs = Math.floor(min / 60);
    if (hrs > 0) return `${hrs}h ${min % 60}m`;
    if (min > 0) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
}

async function fetchDlStatus() {
    try {
        const resp = await fetch('/admin/api/download/status', { headers: getAdminAuthHeaders() });
        if (!resp.ok) return null;
        return await resp.json();
    } catch { return null; }
}

function showDownloadManager() {
    // Stop existing polling
    if (dlPollTimer) { clearInterval(dlPollTimer); dlPollTimer = null; }

    adminContent.innerHTML = `
        <div class="dl-manager">
            <div class="dl-header-bar">
                <h2>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download Manager
                </h2>
                <span id="dlPhaseLabel" style="font-size:.8rem;font-weight:600;color:#64748b;">Loading…</span>
            </div>

            <div class="dl-stats-row" id="dlStatsRow">
                <div class="dl-stat dl-stat-green"><div class="dl-stat-num" id="dlStatDone">—</div><div class="dl-stat-label">Completed</div></div>
                <div class="dl-stat dl-stat-blue"><div class="dl-stat-num" id="dlStatActive">—</div><div class="dl-stat-label">Downloading</div></div>
                <div class="dl-stat dl-stat-amber"><div class="dl-stat-num" id="dlStatPending">—</div><div class="dl-stat-label">Pending</div></div>
                <div class="dl-stat dl-stat-red"><div class="dl-stat-num" id="dlStatFailed">—</div><div class="dl-stat-label">Failed</div></div>
                <div class="dl-stat"><div class="dl-stat-num" id="dlStatTotal">—</div><div class="dl-stat-label">Total Files</div></div>
                <div class="dl-stat"><div class="dl-stat-num" id="dlStatDisk">—</div><div class="dl-stat-label">On Disk</div></div>
            </div>

            <div class="dl-progress-wrap"><div class="dl-progress-bar" id="dlProgressBar" style="width:0%"></div></div>

            <div class="dl-actions" id="dlActions">
                <button class="dl-btn dl-btn-primary" id="dlStartBtn" onclick="startDownload()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Start Download
                </button>
                <button class="dl-btn dl-btn-danger" id="dlStopBtn" onclick="stopDownload()" disabled>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    Stop
                </button>
                <button class="dl-btn dl-btn-secondary" onclick="showDownloadManager()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Refresh
                </button>
            </div>

            <div class="dl-filters" id="dlFilters">
                <button class="dl-filter-btn active" onclick="filterOrganisms('all')">All</button>
                <button class="dl-filter-btn" onclick="filterOrganisms('done')">✔ Done</button>
                <button class="dl-filter-btn" onclick="filterOrganisms('downloading')">⬇ Active</button>
                <button class="dl-filter-btn" onclick="filterOrganisms('pending')">◌ Pending</button>
                <button class="dl-filter-btn" onclick="filterOrganisms('error')">✖ Failed</button>
            </div>

            <div class="dl-grid" id="dlGrid">
                <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#94a3b8;">Loading organism data…</div>
            </div>

            <div class="dl-log" id="dlLog">Waiting for data…</div>
        </div>
    `;

    // Initial fetch + start polling
    updateDownloadUI();
    dlPollTimer = setInterval(updateDownloadUI, 3000);
}

async function updateDownloadUI() {
    const resp = await fetchDlStatus();
    if (!resp || !resp.success) return;

    const { state, disk, logs } = resp;

    // Phase label
    const phaseEl = document.getElementById('dlPhaseLabel');
    if (phaseEl) {
        const labels = {
            idle: '● Idle — Ready to start',
            discovering: '◉ Discovering files…',
            downloading: '⬇ Downloading…',
            done: '✔ Complete',
            error: '✖ Error',
            stopped: '⏸ Stopped'
        };
        let label = labels[state.phase] || state.phase;
        if (state.startedAt && (state.phase === 'downloading' || state.phase === 'discovering')) {
            label += ` (${fmtElapsed(Date.now() - state.startedAt)})`;
        }
        phaseEl.textContent = label;
    }

    // Stats
    const orgs = state.organisms || [];
    const doneOrgs = orgs.filter(o => o.status === 'done' || o.status === 'partial').length;
    const activeOrgs = orgs.filter(o => o.status === 'downloading' || o.status === 'discovering').length;
    const pendingOrgs = orgs.filter(o => o.status === 'pending').length;
    const errorOrgs = orgs.filter(o => o.status === 'partial').length;

    const setNum = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setNum('dlStatDone', state.phase === 'idle' ? disk.folders.length : (state.completed - state.failed));
    setNum('dlStatActive', activeOrgs);
    setNum('dlStatPending', state.phase === 'idle' ? '—' : pendingOrgs);
    setNum('dlStatFailed', state.failed);
    setNum('dlStatTotal', state.totalFiles || '—');
    // Filter out single-file organisms to match the main site count
    const filteredFolders = disk.folders.filter(f => f.files > 1);
    const filteredSize = filteredFolders.reduce((s, f) => s + f.size, 0);
    setNum('dlStatDisk', `${filteredFolders.length} folders / ${fmtBytes(filteredSize)}`);

    // Progress bar
    const pBar = document.getElementById('dlProgressBar');
    if (pBar && state.totalFiles > 0) {
        const pct = Math.round((state.completed / state.totalFiles) * 100);
        pBar.style.width = pct + '%';
        pBar.classList.toggle('active', state.running);
    }

    // Buttons
    const startBtn = document.getElementById('dlStartBtn');
    const stopBtn = document.getElementById('dlStopBtn');
    if (startBtn) startBtn.disabled = state.running;
    if (stopBtn) stopBtn.disabled = !state.running;

    // Update sidebar badge
    const badge = document.getElementById('dlBadge');
    if (badge) {
        if (state.running && state.totalFiles > 0) {
            badge.style.display = 'inline';
            badge.textContent = Math.round((state.completed / state.totalFiles) * 100) + '%';
        } else {
            badge.style.display = 'none';
        }
    }

    // Organism grid
    renderOrganismGrid(orgs, disk);

    // Logs
    const logEl = document.getElementById('dlLog');
    if (logEl && logs && logs.length > 0) {
        logEl.innerHTML = logs.map(l => {
            const cls = l.level === 'ok' ? 'log-ok' : l.level === 'err' ? 'log-err' : l.level === 'warn' ? 'log-warn' : 'log-info';
            const time = l.time ? l.time.split('T')[1]?.split('.')[0] || '' : '';
            return `<span class="${cls}">[${time}] ${escapeHtml(l.msg)}</span>`;
        }).join('\n');
        logEl.scrollTop = logEl.scrollHeight;
    } else if (logEl && state.phase === 'idle') {
        // Show disk info in log area (use same filtered set as stats card)
        logEl.innerHTML = filteredFolders.length > 0
            ? `<span class="log-info">On disk: ${filteredFolders.length} organism folders (${fmtBytes(filteredSize)})</span>\n` +
              filteredFolders.map(f => `<span class="log-ok">  ${f.name}: ${f.files} files (${fmtBytes(f.size)})</span>`).join('\n')
            : '<span class="log-info">No files downloaded yet. Click "Start Download" to begin.</span>';
    }
}

function renderOrganismGrid(orgs, disk) {
    const grid = document.getElementById('dlGrid');
    if (!grid) return;

    // Merge live state with disk info
    let items = [];
    if (orgs && orgs.length > 0) {
        items = orgs;
    } else if (disk && disk.folders.length > 0) {
        items = disk.folders.map(f => ({ name: f.name, status: 'done', fileCount: f.files, completedFiles: f.files, failedFiles: 0 }));
    }

    if (items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#94a3b8;">No organisms discovered yet. Start a download to scan AmoebaDB.</div>';
        return;
    }

    // Apply filter
    let filtered = items;
    if (dlCurrentFilter === 'done') filtered = items.filter(o => o.status === 'done' || o.status === 'partial');
    else if (dlCurrentFilter === 'downloading') filtered = items.filter(o => o.status === 'downloading' || o.status === 'discovering');
    else if (dlCurrentFilter === 'pending') filtered = items.filter(o => o.status === 'pending');
    else if (dlCurrentFilter === 'error') filtered = items.filter(o => o.status === 'partial' && o.failedFiles > 0);

    grid.innerHTML = filtered.map(o => {
        let iconClass = 'pending', statusClass = 'pending', statusText = 'Pending', icon = '◌';
        if (o.status === 'done') { iconClass = 'done'; statusClass = 'done'; statusText = 'Done'; icon = '✔'; }
        else if (o.status === 'downloading' || o.status === 'discovering') { iconClass = 'active'; statusClass = 'active'; statusText = o.status === 'discovering' ? 'Scanning…' : 'Downloading'; icon = '⬇'; }
        else if (o.status === 'partial') { iconClass = 'error'; statusClass = 'error'; statusText = 'Partial'; icon = '⚠'; }
        else if (o.status === 'error') { iconClass = 'error'; statusClass = 'error'; statusText = 'Error'; icon = '✖'; }
        const meta = o.fileCount ? `${o.completedFiles || 0}/${o.fileCount} files` : '';
        return `
            <div class="dl-card">
                <div class="dl-card-icon ${iconClass}">${icon}</div>
                <div class="dl-card-info">
                    <div class="dl-card-name">${escapeHtml(o.name)}</div>
                    <div class="dl-card-meta">${meta}</div>
                </div>
                <span class="dl-card-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

function filterOrganisms(filter) {
    dlCurrentFilter = filter;
    document.querySelectorAll('.dl-filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    // Re-render with current data
    updateDownloadUI();
}

async function startDownload() {
    try {
        const resp = await fetch('/admin/api/download/start', {
            method: 'POST',
            headers: getAdminAuthHeaders()
        });
        const data = await resp.json();
        if (!resp.ok) {
            alert(data.error || 'Failed to start download');
            return;
        }
        // Immediately refresh
        updateDownloadUI();
    } catch (err) {
        alert('Failed to start download: ' + err.message);
    }
}

async function stopDownload() {
    try {
        const resp = await fetch('/admin/api/download/stop', {
            method: 'POST',
            headers: getAdminAuthHeaders()
        });
        const data = await resp.json();
        if (!resp.ok) {
            alert(data.error || 'Failed to stop download');
        }
        updateDownloadUI();
    } catch (err) {
        alert('Failed to stop download: ' + err.message);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

// beforeunload warning removed — it was incorrectly firing whenever any
// data was loaded (not just when there were actual unsaved changes).

// ── Sidebar: All Organisms ────────────────────────────────────────────────────
async function loadSidebarOrganisms() {
    const container = document.getElementById('allOrganismsList');
    const countEl = document.getElementById('allOrgsCount');
    if (!container) return;
    try {
        const resp = await fetch('/api/organisms');
        const data = await resp.json();
        if (!data.success) return;

        // Show all organisms (curated ones show with a special badge)
        const others = data.organisms;

        if (countEl) countEl.textContent = `${others.length} organisms`;

        container.innerHTML = others.map(org => {
            const initials = org.shortName
                ? org.shortName.replace(/[^A-Z]/g, '').slice(0, 2) || org.name.slice(0, 2).toUpperCase()
                : org.name.slice(0, 2).toUpperCase();
            const hue = Math.abs(org.key.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0)) % 360;
            return `<a class="sidebar-btn" href="/organisms?selected=${escapeHtml(org.key)}" target="_blank"
                style="text-decoration:none;padding:.4rem .75rem .4rem .85rem"
                title="${escapeHtml(org.name)}">
                <span style="width:22px;height:22px;border-radius:6px;background:hsl(${hue},45%,38%);
                    display:flex;align-items:center;justify-content:center;
                    font-size:.58rem;font-weight:800;color:#fff;flex-shrink:0">${initials}</span>
                <span class="sidebar-label" style="font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(org.name)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    width="10" height="10" style="margin-left:auto;opacity:.35;flex-shrink:0">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
            </a>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load sidebar organisms:', e);
        if (container) container.innerHTML = '<div class="sidebar-btn" style="opacity:.4;font-size:.75rem;cursor:default">Failed to load</div>';
    }
}
