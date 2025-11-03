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
  const src = path.join(projectRoot, '.next', 'static');
  const dest = path.join(projectRoot, '.next', 'standalone', '.next', 'static');
  try {
    await fsp.access(src);
  } catch {
    console.error('Source static directory not found:', src);
    process.exit(1);
  }
  await copyDir(src, dest);
  console.log('Copied .next/static -> .next/standalone/.next/static');
})();
