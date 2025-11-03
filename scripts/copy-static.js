const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

async function copyDir(src, dest) {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await fsp.mkdir(dest, { recursive: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const link = await fsp.readlink(srcPath);
      try { await fsp.symlink(link, destPath); } catch {}
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }));
}

(async () => {
  const projectRoot = process.cwd();

  // Copy .next/static (required for Next server)
  const staticSrc = path.join(projectRoot, '.next', 'static');
  const staticDest = path.join(projectRoot, '.next', 'standalone', '.next', 'static');
  try {
    await fsp.access(staticSrc);
    await copyDir(staticSrc, staticDest);
    console.log('Copied .next/static -> .next/standalone/.next/static');
  } catch {
    console.error('Source static directory not found:', staticSrc);
  }

  // Copy public assets so standalone server can serve them
  const publicSrc = path.join(projectRoot, 'public');
  const publicDest = path.join(projectRoot, '.next', 'standalone', 'public');
  try {
    await fsp.access(publicSrc);
    await copyDir(publicSrc, publicDest);
    console.log('Copied public -> .next/standalone/public');
  } catch {
    // public folder may not exist; that's fine
  }
})();
