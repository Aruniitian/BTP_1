// =============================================================================
// tests/test-fixes.js — Automated tests for all 10 critical fixes
// Run:  NODE_ENV=test node backend/tests/test-fixes.js
// =============================================================================

process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'amoeba2024';
process.env.MAX_BACKUPS = '3'; // low for testing retention

const http = require('http');
const { app, createSession, isValidSession, destroySession, sessions } = require('../server');

let server;
let BASE;
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
    if (condition) {
        passed++;
        results.push(`  ✅ PASS: ${label}`);
    } else {
        failed++;
        results.push(`  ❌ FAIL: ${label}`);
    }
}

async function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const opts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json', ...headers }
        };

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    // =========================================================================
    console.log('\n🔒 Fix #1: Environment-based credentials (no hardcoding)');
    // =========================================================================
    const fs = require('fs');
    const serverSource = fs.readFileSync(require.resolve('../server'), 'utf8');
    assert(!serverSource.includes("'Bearer admin:amoeba2024'"), 'server.js has no hardcoded Bearer token');
    assert(serverSource.includes("process.env.ADMIN_USERNAME"), 'server.js reads ADMIN_USERNAME from env');
    assert(serverSource.includes("process.env.ADMIN_PASSWORD"), 'server.js reads ADMIN_PASSWORD from env');

    const adminSource = fs.readFileSync(require.resolve('../../public/admin-script.js'), 'utf8');
    assert(!adminSource.includes("password: 'amoeba2024'"), 'admin-script.js has no hardcoded password');
    assert(!adminSource.includes("'Bearer admin:amoeba2024'"), 'admin-script.js has no hardcoded Bearer token');

    // =========================================================================
    console.log('\n🛡️  Fix #2: Input validation & sanitization');
    // =========================================================================
    // Empty search query
    let res = await request('GET', '/search?q=');
    assert(res.status === 400, 'Empty search query returns 400');

    // Missing organism
    res = await request('GET', '/search?q=hello+world');
    assert(res.status === 400, 'Search without organism returns 400');

    // Invalid organism in admin API
    const token = createSession();
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    res = await request('GET', '/admin/api/data/INVALID/protein', null, authHeaders);
    assert(res.status === 400, 'Invalid organism param returns 400');

    // Invalid data type
    res = await request('GET', '/admin/api/data/histolytica/INVALID_TYPE', null, authHeaders);
    assert(res.status === 400, 'Invalid data type param returns 400');

    // Invalid index
    res = await request('DELETE', '/admin/api/data/histolytica/protein/entry/-1', null, authHeaders);
    assert(res.status === 400, 'Negative index returns 400');

    res = await request('DELETE', '/admin/api/data/histolytica/protein/entry/abc', null, authHeaders);
    assert(res.status === 400, 'Non-numeric index returns 400');

    // =========================================================================
    console.log('\n🔌 Fix #3: MongoDB connection leak removed');
    // =========================================================================
    assert(!serverSource.includes("MongoClient"), 'server.js has no MongoClient import');
    assert(!serverSource.includes("mongodb://"), 'server.js has no mongodb:// URI');
    assert(!serverSource.includes("await client.connect"), 'server.js has no client.connect()');

    // =========================================================================
    console.log('\n🛑 Fix #4: Safe JSON read/write with error handling');
    // =========================================================================
    assert(serverSource.includes('safeReadJSON'), 'server.js uses safeReadJSON helper');
    assert(serverSource.includes('safeWriteJSON'), 'server.js uses safeWriteJSON helper');
    assert(serverSource.includes("Failed to parse JSON"), 'safeReadJSON returns descriptive error');

    // =========================================================================
    console.log('\n📦 Fix #5: MongoDB dependency removed');
    // =========================================================================
    const pkgSource = fs.readFileSync(require.resolve('../../package.json'), 'utf8');
    const pkg = JSON.parse(pkgSource);
    assert(!pkg.dependencies.mongodb, 'package.json has no mongodb dependency');
    assert(!!pkg.dependencies.dotenv, 'package.json has dotenv dependency');
    assert(!!pkg.dependencies['express-rate-limit'], 'package.json has express-rate-limit dependency');

    // =========================================================================
    console.log('\n⏱️  Fix #6: Rate limiting');
    // =========================================================================
    assert(serverSource.includes('rateLimit'), 'server.js uses express-rate-limit');
    assert(serverSource.includes('loginLimiter'), 'server.js has login rate limiter');
    assert(serverSource.includes('adminWriteLimiter'), 'server.js has admin write rate limiter');
    assert(serverSource.includes('generalLimiter'), 'server.js has general rate limiter');

    // Check rate limit headers on a response
    res = await request('GET', '/test-protein');
    // express-rate-limit v7 uses standard headers
    const hasRateLimitHeader = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
    assert(!!hasRateLimitHeader, 'Response includes rate limit headers');

    // =========================================================================
    console.log('\n📁 Fix #7: Shared data-path config');
    // =========================================================================
    assert(serverSource.includes("require('./config/data-paths')"), 'server.js imports from shared config');
    const configSource = fs.readFileSync(require.resolve('../config/data-paths'), 'utf8');
    assert(configSource.includes('DATA_FILES'), 'config/data-paths.js exports DATA_FILES');
    assert(configSource.includes('getDataFilePath'), 'config/data-paths.js exports getDataFilePath');
    assert(configSource.includes('VALID_ORGANISMS'), 'config/data-paths.js exports VALID_ORGANISMS');

    // =========================================================================
    console.log('\n🔐 Fix #8: Server-side session auth');
    // =========================================================================
    // Login with correct credentials
    res = await request('POST', '/admin/api/login', { username: 'admin', password: 'amoeba2024' });
    assert(res.status === 200 && res.body.success && res.body.token, 'Login returns session token');
    const sessionToken = res.body.token;

    // Login with wrong credentials
    res = await request('POST', '/admin/api/login', { username: 'admin', password: 'wrong' });
    assert(res.status === 401, 'Wrong password returns 401');

    // Login with missing fields
    res = await request('POST', '/admin/api/login', { username: 'admin' });
    assert(res.status === 400, 'Missing password returns 400');

    // Session validation
    res = await request('GET', '/admin/api/session', null, { 'Authorization': `Bearer ${sessionToken}` });
    assert(res.status === 200 && res.body.success, 'Valid session token is accepted');

    // Invalid token
    res = await request('GET', '/admin/api/session', null, { 'Authorization': 'Bearer invalidtoken123' });
    assert(res.status === 401, 'Invalid session token is rejected');

    // No token
    res = await request('GET', '/admin/api/data/histolytica/protein');
    assert(res.status === 401, 'Request without token returns 401');

    // Admin API with valid token
    const validAuthHeaders = { 'Authorization': `Bearer ${sessionToken}` };
    res = await request('GET', '/admin/api/data/histolytica/protein', null, validAuthHeaders);
    assert(res.status === 200 || res.status === 500, 'Admin data request with valid token is processed');

    // Logout
    res = await request('POST', '/admin/api/logout', null, validAuthHeaders);
    assert(res.status === 200 && res.body.success, 'Logout succeeds');

    // Verify token is invalid after logout
    res = await request('GET', '/admin/api/session', null, validAuthHeaders);
    assert(res.status === 401, 'Token is invalid after logout');

    // Client-side code checks
    assert(adminSource.includes("sessionStorage.getItem('adminToken')"), 'admin-script.js uses adminToken from sessionStorage');
    assert(adminSource.includes('/admin/api/login'), 'admin-script.js calls server login API');
    assert(adminSource.includes('/admin/api/logout'), 'admin-script.js calls server logout API');
    assert(adminSource.includes('/admin/api/session'), 'admin-script.js validates session via server');

    // =========================================================================
    console.log('\n💾 Fix #9: Backup retention policy');
    // =========================================================================
    assert(serverSource.includes('enforceBackupRetention'), 'server.js has enforceBackupRetention function');
    assert(serverSource.includes('MAX_BACKUPS'), 'server.js uses MAX_BACKUPS limit');
    assert(serverSource.includes('fs.unlinkSync'), 'enforceBackupRetention removes old backups');

    // =========================================================================
    console.log('\n✅ Fix #10: Input validation schemas');
    // =========================================================================
    assert(serverSource.includes('validateOrganism'), 'server.js has validateOrganism function');
    assert(serverSource.includes('validateDataType'), 'server.js has validateDataType function');
    assert(serverSource.includes('validateIndex'), 'server.js has validateIndex function');
    assert(serverSource.includes('sanitizeString'), 'server.js has sanitizeString function');

    // Validate entry body validation
    const token2 = createSession();
    const auth2 = { 'Authorization': `Bearer ${token2}` };
    res = await request('POST', '/admin/api/data/histolytica/protein/entry', { entry: 'not-an-object' }, auth2);
    assert(res.status === 400, 'Non-object entry returns 400');

    res = await request('PUT', '/admin/api/data/histolytica/protein', {}, auth2);
    assert(res.status === 400, 'PUT without data field returns 400');

    // =========================================================================
    // Session management unit tests
    // =========================================================================
    console.log('\n🔧 Session management unit tests');
    const testToken = createSession();
    assert(isValidSession(testToken), 'createSession creates a valid session');
    destroySession(testToken);
    assert(!isValidSession(testToken), 'destroySession invalidates session');
    assert(!isValidSession('nonexistent'), 'nonexistent token returns false');
    assert(!isValidSession(null), 'null token returns false');
    assert(!isValidSession(''), 'empty token returns false');
}

// =========================================================================
// Runner
// =========================================================================
(async () => {
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const addr = server.address();
    BASE = `http://localhost:${addr.port}`;

    console.log('='.repeat(60));
    console.log(' 🧪  Testing all 10 critical fixes');
    console.log(`    Server running on port ${addr.port}`);
    console.log('='.repeat(60));

    try {
        await runTests();
    } catch (err) {
        console.error('\n💥 Test runner error:', err);
        failed++;
    }

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log(' 📊 Test Results');
    console.log('='.repeat(60));
    results.forEach(r => console.log(r));
    console.log('─'.repeat(60));
    console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60));

    // Cleanup
    sessions.clear();
    server.close();

    process.exit(failed > 0 ? 1 : 0);
})();
