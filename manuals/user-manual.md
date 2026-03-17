# User Manual

## 1. What This Website Does

AmoebaDB Browser helps you:
- Browse Amoeba/Entamoeba organism datasets.
- Search IDs and records quickly.
- View downloaded raw files and parsed records.
- Use the admin panel to manage curated JSON records (authorized users only).

## 2. Minimum Requirements

- Windows desktop/laptop
- Node.js installed
- Modern browser (Edge/Chrome)
- Project folder copied completely (do not copy partial files)

## 3. First-Time Setup on a New Desktop

1. Install Node.js LTS.
2. Copy the full project folder to desktop (or another fixed location).
3. Open Command Prompt in project root.
4. Run:

```cmd
npm install
```

5. If frontend folder is present and not built yet, run:

```cmd
npm run build:frontend
```

6. Launch by double-clicking start_amoebadb.bat.

## 4. Daily Start Procedure

1. Double-click start_amoebadb.bat.
2. Wait a few seconds.
3. Browser should open automatically at:

http://localhost:3000

4. Keep the AmoebaDB Server command window open while using the site.

If that window is closed, website stops running.

## 5. Daily Stop Procedure

- Close the server command window titled AmoebaDB Server.
- Close browser tabs if desired.

## 6. Desktop Shortcut Setup (Recommended)

1. Right-click desktop -> New -> Shortcut.
2. Choose start_amoebadb.bat from project folder.
3. Name it AmoebaDB.
4. Finish.
5. Optional: Right-click shortcut -> Properties -> Change Icon to set custom .ico file.

After this, user only needs to double-click the desktop shortcut.

## 7. User Navigation Guide

### Main website
- Open http://localhost:3000
- Use organism/data views and search interface.

### Admin panel (authorized users)
- Open http://localhost:3000/admin
- Login with admin username/password.
- Perform add/edit/delete operations carefully.

## 8. If Desktop Gets Updated (Windows update)

Usually nothing is required. If app fails after update:
1. Restart the system.
2. Launch again via desktop shortcut.
3. If not working, open project folder and double-click start_amoebadb.bat directly.
4. If still failing, run in Command Prompt:

```cmd
npm install
npm start
```

Then open http://localhost:3000 manually.

## 9. If System Crashes or Reboots Unexpectedly

After reboot:
1. Open project folder.
2. Double-click start_amoebadb.bat (or desktop shortcut).
3. Verify website opens.
4. If any data edit seems missing, check admin backups from admin panel/API.

Important:
- Admin data writes create backup files before update.
- A crash during an edit may require restore from a backup JSON file.

## 10. If Shortcut Stops Working

Likely reason: project folder path changed.

Fix:
1. Delete old shortcut.
2. Re-create shortcut pointing to current start_amoebadb.bat.
3. Test by double-clicking new shortcut.

## 11. If Port 3000 Is Busy

Symptoms:
- Browser says site cannot be reached.
- Server window shows port-in-use error.

Actions:
1. Close other local servers/apps using port 3000.
2. Restart AmoebaDB.
3. If needed, ask developer to change the app port.

## 12. If Login Fails (Admin)

1. Confirm correct username/password.
2. Try again after 1-2 minutes if many failed attempts were made.
3. If still failing, ask developer to reset admin credentials.

## 13. Backup and Recovery Basics

- The system creates backup JSON files automatically during admin updates.
- Keep project folder backups (zip copy) weekly or before major edits.
- For safe recovery after major issue:
  1. Stop server.
  2. Restore known-good backup files.
  3. Start server again.

## 14. Moving to Another Computer

1. Copy full project folder.
2. Install Node.js.
3. Run npm install in project root.
4. Build frontend if required: npm run build:frontend.
5. Launch start_amoebadb.bat.
6. Recreate desktop shortcut.

## 15. Basic Health Check Checklist

Run these checks when user reports issue:
1. Server window open?
2. URL opens: http://localhost:3000?
3. Admin opens: http://localhost:3000/admin?
4. Search returns results?
5. No obvious error in server window?

## 16. Quick Help Messages for Users

- Website not opening: Start start_amoebadb.bat and keep server window open.
- Shortcut not working: Recreate desktop shortcut.
- Data edit issue: Use backup restore with developer help.
- After update/crash: Restart machine, run start_amoebadb.bat again.
