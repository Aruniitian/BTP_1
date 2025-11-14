// admin-main.js (minimal shim)
// Keep this file tiny and non-conflicting with the full admin panel script
// (`admin-script.js`). Its job is only to make the Admin Login link/button
// behave sensibly on the main site.

document.addEventListener('DOMContentLoaded', () => {
  const adminBtn = document.getElementById('adminLoginBtn');
  if (!adminBtn) return;

  adminBtn.addEventListener('click', (e) => {
    const href = adminBtn.getAttribute('href') || '';
    if (href.trim() === '#' || href.trim() === '') {
      e.preventDefault();
      window.location.href = '/admin';
    }
    // otherwise allow default navigation
  });
});
