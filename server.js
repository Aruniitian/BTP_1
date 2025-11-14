const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware for parsing JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection URI
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Also serve the top-level Entamoeba_images folder so images can be referenced
app.use('/Entamoeba_images', express.static(path.join(__dirname, 'Entamoeba_images')));

// Root route to serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin panel route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Test endpoint to check if protein data is accessible
app.get('/test-protein', (req, res) => {
    const fs = require('fs');
    const filePath = path.join(__dirname, 'public', 'Data', 'Entamoeba Histolytica', 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json');
    
    console.log('Testing protein file access:', filePath);
    
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        res.json({
            exists: true,
            size: stats.size,
            path: filePath,
            message: 'Protein data file is accessible'
        });
    } else {
        res.status(404).json({
            exists: false,
            path: filePath,
            message: 'Protein data file not found'
        });
    }
});

// Search API endpoint
app.get('/search', async (req, res) => {
    try {
        await client.connect();
        const database = client.db("amoebadatabase");
        const collection = database.collection("amoebadata");

        const query = req.query.q;

        let mongoQuery = {};

        // Use the exact organism name from your database
        if (query.includes("Entamoeba Histolytica")) {
            mongoQuery.organism = "Entamoeba Histolytica"; 
        } else if (query.includes("Entamoeba Invadens")) {
            // Note: You must update your database to have this exact organism name
            mongoQuery.organism = "Entamoeba Invadens";
        } else {
            return res.status(400).send("Invalid search query.");
        }

        if (/transcriptomics|transcripts/i.test(query)) {
            // Find documents with the 'transcript_id' field
            mongoQuery.transcript_id = { "$exists": true };
        } else if (query.includes("Protein Sequence")) {
            // Find documents with the 'protein_id' field
            mongoQuery.protein_id = { "$exists": true };
        }

        const results = await collection.find(mongoQuery).toArray();
        res.json(results);

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    } finally {
        await client.close();
    }
});

// Admin API Endpoints

// Helper function to get file path based on organism and data type
function getDataFilePath(organism, dataType) {
    const basePath = path.join(__dirname, 'public', 'Data');
    
    if (organism === 'histolytica') {
        const organismPath = path.join(basePath, 'Entamoeba Histolytica');
        switch (dataType) {
            case 'transcriptomics':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedTranscripts.json');
            case 'protein':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedProteins.json');
            case 'cds':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_AnnotatedCDSs.json');
            case 'genome':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_Genome.json');
            case 'codon-usage':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_CodonUsage.json');
            case 'orf':
            case 'orf50':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_Orf50.json');
            case 'gene-aliases':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_GeneAliases.json');
            case 'curated-go':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_Curated_GO.gaf.json');
            case 'go-gaf':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_GO.gaf.json');
            case 'ncbi-linkout-nucleotide':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Nucleotide.json');
            case 'ncbi-linkout-protein':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS_NCBILinkout_Protein.json');
            case 'full-gff':
                return path.join(organismPath, 'AmoebaDB-68_EhistolyticaHM1IMSS.json');
        }
    } else if (organism === 'invadens') {
        const organismPath = path.join(basePath, 'Entamoeba Invadens');
        switch (dataType) {
            case 'transcriptomics':
                return path.join(organismPath, 'EinvadensIP1_AnnotatedTranscripts.json');
            case 'protein':
                return path.join(organismPath, 'EinvadensIP1_AnnotatedProteins.json');
            case 'cds':
                return path.join(organismPath, 'EinvadensIP1_AnnotatedCDSs.json');
            case 'genome':
                return path.join(organismPath, 'EinvadensIP1_Genome.json');
            case 'codon-usage':
                return path.join(organismPath, 'EinvadensIP1_CodonUsage.json');
            case 'gene-aliases':
                return path.join(organismPath, 'EinvadensIP1_GeneAliases.json');
            case 'full-gff':
                return path.join(organismPath, 'AmoebaDB-68_EinvadensIP1.json');
        }
    }
    return null;
}

// Create backup of data file
function createBackup(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = filePath.replace('.json', `_backup_${timestamp}.json`);
    
    try {
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, backupPath);
            console.log(`Backup created: ${backupPath}`);
            return backupPath;
        }
    } catch (error) {
        console.error('Error creating backup:', error);
    }
    return null;
}

// Admin authentication middleware (basic implementation)
function authenticateAdmin(req, res, next) {
    // In production, implement proper JWT or session-based authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || authHeader !== 'Bearer admin:amoeba2024') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
}

// Get data for admin panel
app.get('/admin/api/data/:organism/:dataType', authenticateAdmin, (req, res) => {
    const { organism, dataType } = req.params;
    const filePath = getDataFilePath(organism, dataType);
    // Debugging/logging: show what was requested and the resolved file path
    console.log(`[ADMIN GET] request for ${organism}/${dataType}`);
    console.log(`[ADMIN GET] resolved filePath: ${filePath}`);
    const exists = filePath && fs.existsSync(filePath);
    console.log(`[ADMIN GET] file exists? ${exists}`);

    if (!filePath || !exists) {
        return res.status(404).json({ error: 'Data file not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({
            success: true,
            data: data,
            count: data.length,
            filePath: filePath
        });
    } catch (error) {
        console.error('Error reading data file:', error);
        res.status(500).json({ error: 'Error reading data file' });
    }
});

// Update entire dataset
app.put('/admin/api/data/:organism/:dataType', authenticateAdmin, (req, res) => {
    const { organism, dataType } = req.params;
    const { data } = req.body;
    const filePath = getDataFilePath(organism, dataType);
    
    if (!filePath) {
        return res.status(404).json({ error: 'Invalid organism or data type' });
    }
    
    try {
        // Create backup before modification
        const backupPath = createBackup(filePath);
        
        // Write new data
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`Data updated for ${organism}/${dataType}`);
        res.json({
            success: true,
            message: 'Data updated successfully',
            backupPath: backupPath,
            count: data.length
        });
    } catch (error) {
        console.error('Error updating data file:', error);
        res.status(500).json({ error: 'Error updating data file' });
    }
});

// Add single entry
app.post('/admin/api/data/:organism/:dataType/entry', authenticateAdmin, (req, res) => {
    const { organism, dataType } = req.params;
    const { entry } = req.body;
    const filePath = getDataFilePath(organism, dataType);
    
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Data file not found' });
    }
    
    try {
        // Read current data
        const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Create backup
        createBackup(filePath);
        
        // Add new entry
        currentData.push(entry);
        
        // Write updated data
        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
        
        console.log(`Entry added to ${organism}/${dataType}`);
        res.json({
            success: true,
            message: 'Entry added successfully',
            count: currentData.length
        });
    } catch (error) {
        console.error('Error adding entry:', error);
        res.status(500).json({ error: 'Error adding entry' });
    }
});

// Update single entry
app.put('/admin/api/data/:organism/:dataType/entry/:index', authenticateAdmin, (req, res) => {
    const { organism, dataType, index } = req.params;
    const { entry } = req.body;
    const filePath = getDataFilePath(organism, dataType);
    
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Data file not found' });
    }
    
    try {
        // Read current data
        const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const entryIndex = parseInt(index);
        
        if (entryIndex < 0 || entryIndex >= currentData.length) {
            return res.status(400).json({ error: 'Invalid entry index' });
        }
        
        // Create backup
        createBackup(filePath);
        
        // Update entry
        currentData[entryIndex] = entry;
        
        // Write updated data
        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
        
        console.log(`Entry updated in ${organism}/${dataType} at index ${entryIndex}`);
        res.json({
            success: true,
            message: 'Entry updated successfully'
        });
    } catch (error) {
        console.error('Error updating entry:', error);
        res.status(500).json({ error: 'Error updating entry' });
    }
});

// Delete single entry
app.delete('/admin/api/data/:organism/:dataType/entry/:index', authenticateAdmin, (req, res) => {
    const { organism, dataType, index } = req.params;
    const filePath = getDataFilePath(organism, dataType);
    
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Data file not found' });
    }
    
    try {
        // Read current data
        const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const entryIndex = parseInt(index);
        
        if (entryIndex < 0 || entryIndex >= currentData.length) {
            return res.status(400).json({ error: 'Invalid entry index' });
        }
        
        // Create backup
        createBackup(filePath);
        
        // Remove entry
        currentData.splice(entryIndex, 1);
        
        // Write updated data
        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
        
        console.log(`Entry deleted from ${organism}/${dataType} at index ${entryIndex}`);
        res.json({
            success: true,
            message: 'Entry deleted successfully',
            count: currentData.length
        });
    } catch (error) {
        console.error('Error deleting entry:', error);
        res.status(500).json({ error: 'Error deleting entry' });
    }
});

// Get backup files list
app.get('/admin/api/backups', authenticateAdmin, (req, res) => {
    const dataPath = path.join(__dirname, 'public', 'Data');
    const backupFiles = [];
    
    try {
        // Search for backup files in both organism directories
        const searchBackups = (dir) => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    if (file.includes('_backup_') && file.endsWith('.json')) {
                        const filePath = path.join(dir, file);
                        const stats = fs.statSync(filePath);
                        backupFiles.push({
                            name: file,
                            path: filePath,
                            size: stats.size,
                            created: stats.mtime
                        });
                    }
                });
            }
        };
        
        searchBackups(path.join(dataPath, 'Entamoeba Histolytica'));
        searchBackups(path.join(dataPath, 'Entamoeba Invadens'));
        
        // Sort by creation date (newest first)
        backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        res.json({
            success: true,
            backups: backupFiles
        });
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Error listing backup files' });
    }
});

app.listen(port, () => {
    console.log(`AmoebaDatabase server listening at http://localhost:${port}`);
    console.log(`Admin panel available at http://localhost:${port}/admin`);
});