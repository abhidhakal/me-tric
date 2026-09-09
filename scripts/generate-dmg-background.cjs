const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '../build');
fs.mkdirSync(buildDir, { recursive: true });

function createSvg(width, height, scale = 1) {
  // Base coordinates scaled by `scale`
  const s = (val) => val * scale;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#141419" />
      <stop offset="50%" stop-color="#0f0f13" />
      <stop offset="100%" stop-color="#09090c" />
    </linearGradient>

    <!-- Ambient Top Glow -->
    <radialGradient id="topGlow" cx="50%" cy="0%" r="60%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.08)" />
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0)" />
    </radialGradient>

    <!-- Arrow Gradient -->
    <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.15)" />
      <stop offset="50%" stop-color="rgba(255, 255, 255, 0.7)" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>

    <!-- Arrowhead Marker -->
    <marker id="arrowhead" markerWidth="${s(8)}" markerHeight="${s(8)}" refX="${s(6)}" refY="${s(4)}" orient="auto">
      <polygon points="0 0, ${s(8)} ${s(4)}, 0 ${s(8)}" fill="#ffffff" />
    </marker>

    <!-- Drop Shadow for Pedestals -->
    <filter id="pedestalGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${s(6)}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Rect -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect width="${width}" height="${height}" fill="url(#topGlow)" />

  <!-- Subtle Ambient Border -->
  <rect x="${s(1)}" y="${s(1)}" width="${width - s(2)}" height="${height - s(2)}" rx="${s(10)}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="${s(1)}" />

  <!-- Top Branding -->
  <g text-anchor="middle">
    <text x="${s(270)}" y="${s(62)}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif" font-size="${s(20)}" font-weight="700" fill="#ffffff" letter-spacing="-0.02em">MeTric</text>
    <text x="${s(270)}" y="${s(82)}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" font-size="${s(11)}" font-weight="500" fill="rgba(255, 255, 255, 0.45)" letter-spacing="0.01em">Personal Life &amp; Metric Tracker</text>
  </g>

  <!-- App Pedestal (Left: x=140, y=190) -->
  <g transform="translate(${s(140)}, ${s(190)})">
    <ellipse cx="0" cy="${s(48)}" rx="${s(46)}" ry="${s(14)}" fill="rgba(0, 0, 0, 0.45)" filter="url(#pedestalGlow)" />
    <rect x="${s(-42)}" y="${s(-42)}" width="${s(84)}" height="${s(84)}" rx="${s(18)}" fill="rgba(255, 255, 255, 0.025)" stroke="rgba(255, 255, 255, 0.08)" stroke-dasharray="${s(4)} ${s(4)}" stroke-width="${s(1)}" />
  </g>

  <!-- Applications Pedestal (Right: x=400, y=190) -->
  <g transform="translate(${s(400)}, ${s(190)})">
    <ellipse cx="0" cy="${s(48)}" rx="${s(46)}" ry="${s(14)}" fill="rgba(0, 0, 0, 0.45)" filter="url(#pedestalGlow)" />
    <rect x="${s(-42)}" y="${s(-42)}" width="${s(84)}" height="${s(84)}" rx="${s(18)}" fill="rgba(255, 255, 255, 0.025)" stroke="rgba(255, 255, 255, 0.08)" stroke-dasharray="${s(4)} ${s(4)}" stroke-width="${s(1)}" />
  </g>

  <!-- Arrow & Label (Center: between x=205 and x=335) -->
  <g transform="translate(0, 0)">
    <!-- Label above arrow -->
    <text x="${s(270)}" y="${s(176)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="${s(10)}" font-weight="600" fill="rgba(255, 255, 255, 0.6)" letter-spacing="0.08em" text-transform="uppercase">
      DRAG TO INSTALL
    </text>

    <!-- Sleek Arrow Line with Head -->
    <line x1="${s(212)}" y1="${s(190)}" x2="${s(318)}" y2="${s(190)}" stroke="url(#arrowGrad)" stroke-width="${s(2.5)}" stroke-linecap="round" stroke-dasharray="${s(6)} ${s(4)}" />
    <polygon points="${s(318)} ${s(185)}, ${s(328)} ${s(190)}, ${s(318)} ${s(195)}" fill="#ffffff" />
  </g>

  <!-- Bottom Tip -->
  <text x="${s(270)}" y="${s(330)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="${s(10.5)}" font-weight="400" fill="rgba(255, 255, 255, 0.35)">
    Drag the MeTric icon into your Applications folder to get started
  </text>
</svg>
`.trim();
}

// 1. Generate 540x380 SVG & convert to PNG
const svg540 = createSvg(540, 380, 1);
const svgPath = path.join(buildDir, 'background.svg');
const pngPath = path.join(buildDir, 'background.png');
fs.writeFileSync(svgPath, svg540, 'utf8');
execSync(`sips -s format png "${svgPath}" --out "${pngPath}"`, { stdio: 'inherit' });

// 2. Generate 1080x760 @2x SVG & convert to PNG
const svg1080 = createSvg(1080, 760, 2);
const svg2xPath = path.join(buildDir, 'background@2x.svg');
const png2xPath = path.join(buildDir, 'background@2x.png');
fs.writeFileSync(svg2xPath, svg1080, 'utf8');
execSync(`sips -s format png "${svg2xPath}" --out "${png2xPath}"`, { stdio: 'inherit' });

console.log('DMG background images generated successfully in build/');
