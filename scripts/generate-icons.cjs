const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputPath = process.argv[2] || path.join(__dirname, '../src/assets/logo-variants/1024x1024-black.png');

if (!fs.existsSync(inputPath)) {
  console.error(`Input file does not exist: ${inputPath}`);
  process.exit(1);
}

console.log(`Generating icons from: ${inputPath}`);

const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const publicDir = path.join(rootDir, 'public');
const iconsetDir = path.join(rootDir, 'icon.iconset');

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
if (fs.existsSync(iconsetDir)) {
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}
fs.mkdirSync(iconsetDir, { recursive: true });

// 1. Generate iconset for macOS
const iconSizes = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

for (const icon of iconSizes) {
  const dest = path.join(iconsetDir, icon.name);
  execSync(`sips -z ${icon.size} ${icon.size} "${inputPath}" --out "${dest}"`, { stdio: 'pipe' });
}

// 2. Generate .icns via macOS iconutil
const icnsOut = path.join(buildDir, 'icon.icns');
try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsOut}"`, { stdio: 'inherit' });
  console.log(`✓ Created: ${icnsOut}`);
} finally {
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

// 3. Create build/icon.png (512x512) for Linux/Electron window
const iconPng = path.join(buildDir, 'icon.png');
execSync(`sips -z 512 512 "${inputPath}" --out "${iconPng}"`, { stdio: 'pipe' });
console.log(`✓ Created: ${iconPng}`);

// 4. Generate .ico with 16, 32, 48, 64, 128, 256 sizes
const icoSizes = [16, 32, 48, 64, 128, 256];
const tempIcoDir = path.join(rootDir, '.temp_ico');
fs.mkdirSync(tempIcoDir, { recursive: true });

try {
  const pngBuffers = [];
  for (const size of icoSizes) {
    const tempFile = path.join(tempIcoDir, `icon_${size}.png`);
    execSync(`sips -z ${size} ${size} "${inputPath}" --out "${tempFile}"`, { stdio: 'pipe' });
    const buf = fs.readFileSync(tempFile);
    pngBuffers.push({ size, buffer: buf });
  }

  // Assemble ICO binary
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let currentOffset = 6 + (16 * count);
  const dirEntries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // Width
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // Height
    entry.writeUInt8(0, 2); // Colors
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Size
    entry.writeUInt32LE(currentOffset, 12); // Offset
    dirEntries.push(entry);
    currentOffset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer),
  ]);

  const icoPath = path.join(buildDir, 'icon.ico');
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log(`✓ Created: ${icoPath}`);
  console.log(`✓ Created: ${faviconPath}`);
} finally {
  fs.rmSync(tempIcoDir, { recursive: true, force: true });
}

console.log('All icons generated successfully!');
