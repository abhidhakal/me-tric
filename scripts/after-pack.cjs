const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );
  const pluginsDir = path.join(appPath, 'Contents', 'PlugIns');
  const sourceAppex = path.join(__dirname, '..', 'build', 'native', 'MeTricWidgets.appex');

  if (fs.existsSync(sourceAppex)) {
    console.log(`[afterPack] Embedding MeTricWidgets.appex into ${pluginsDir}...`);
    fs.mkdirSync(pluginsDir, { recursive: true });
    const targetAppex = path.join(pluginsDir, 'MeTricWidgets.appex');
    execSync(`rm -rf "${targetAppex}" && cp -R "${sourceAppex}" "${targetAppex}"`);
    const entitlementsPath = path.join(__dirname, '..', 'native', 'MeTricWidgets', 'Resources', 'MeTricWidgets.entitlements');
    try {
      execSync(`codesign --force --deep --sign - --entitlements "${entitlementsPath}" "${targetAppex}"`);
      console.log(`[afterPack] Successfully signed MeTricWidgets.appex with entitlements`);
    } catch (e) {
      console.warn(`[afterPack] Warning: codesign failed on appex:`, e.message);
    }
  } else {
    console.warn(`[afterPack] Warning: ${sourceAppex} not found. Skipping widget embedding.`);
  }
};
