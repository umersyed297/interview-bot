/**
 * Generate AI-themed app icons for Interview Bot
 * Run: node scripts/generate-icons.js
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'images');

// AI Brain icon SVG - professional deep indigo gradient with neural network motif
const createIconSvg = (size, padding = 0) => {
  const s = size;
  const p = padding;
  const inner = s - p * 2;
  const cx = s / 2;
  const cy = s / 2;
  const r = inner * 0.38; // brain circle radius

  return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="50%" style="stop-color:#6366F1"/>
      <stop offset="100%" style="stop-color:#818CF8"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#C7D2FE"/>
      <stop offset="100%" style="stop-color:#E0E7FF"/>
    </linearGradient>
    <radialGradient id="shine" cx="35%" cy="35%" r="60%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="${s*0.01}" stdDeviation="${s*0.02}" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect x="${p}" y="${p}" width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="url(#bg)"/>
  <rect x="${p}" y="${p}" width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="url(#shine)"/>
  
  <!-- Neural Network Nodes (small circles) -->
  ${[
    [cx - r*0.7, cy - r*0.8],
    [cx + r*0.7, cy - r*0.8],
    [cx - r*0.95, cy],
    [cx + r*0.95, cy],
    [cx - r*0.7, cy + r*0.8],
    [cx + r*0.7, cy + r*0.8],
    [cx, cy - r*0.5],
    [cx, cy + r*0.5],
  ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${s*0.018}" fill="rgba(199,210,254,0.5)"/>`).join('\n  ')}
  
  <!-- Neural connections -->
  ${[
    [[cx - r*0.7, cy - r*0.8], [cx, cy - r*0.5]],
    [[cx + r*0.7, cy - r*0.8], [cx, cy - r*0.5]],
    [[cx - r*0.95, cy], [cx, cy - r*0.5]],
    [[cx + r*0.95, cy], [cx, cy - r*0.5]],
    [[cx - r*0.95, cy], [cx, cy + r*0.5]],
    [[cx + r*0.95, cy], [cx, cy + r*0.5]],
    [[cx - r*0.7, cy + r*0.8], [cx, cy + r*0.5]],
    [[cx + r*0.7, cy + r*0.8], [cx, cy + r*0.5]],
    [[cx, cy - r*0.5], [cx, cy + r*0.5]],
  ].map(([[x1,y1],[x2,y2]]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(199,210,254,0.25)" stroke-width="${s*0.006}"/>`).join('\n  ')}
  
  <!-- Central AI Brain Icon -->
  <g filter="url(#shadow)" transform="translate(${cx}, ${cy})">
    <!-- Head silhouette -->
    <path d="M ${-r*0.42} ${-r*0.1}
             C ${-r*0.42} ${-r*0.65}, ${-r*0.15} ${-r*0.82}, ${r*0.05} ${-r*0.82}
             C ${r*0.35} ${-r*0.82}, ${r*0.5} ${-r*0.55}, ${r*0.5} ${-r*0.15}
             C ${r*0.5} ${r*0.1}, ${r*0.38} ${r*0.3}, ${r*0.22} ${r*0.42}
             L ${r*0.22} ${r*0.6}
             C ${r*0.22} ${r*0.68}, ${r*0.16} ${r*0.74}, ${r*0.08} ${r*0.74}
             L ${-r*0.18} ${r*0.74}
             C ${-r*0.26} ${r*0.74}, ${-r*0.32} ${r*0.68}, ${-r*0.32} ${r*0.6}
             L ${-r*0.32} ${r*0.45}
             C ${-r*0.42} ${r*0.25}, ${-r*0.42} ${r*0.05}, ${-r*0.42} ${-r*0.1} Z"
          fill="url(#glow)" opacity="0.95"/>
    
    <!-- Circuit lines on brain -->
    <circle cx="${r*0.05}" cy="${-r*0.35}" r="${r*0.12}" fill="none" stroke="#4F46E5" stroke-width="${s*0.012}" opacity="0.8"/>
    <circle cx="${r*0.05}" cy="${-r*0.35}" r="${r*0.04}" fill="#4F46E5" opacity="0.9"/>
    <line x1="${r*0.05}" y1="${-r*0.23}" x2="${r*0.05}" y2="${-r*0.05}" stroke="#4F46E5" stroke-width="${s*0.008}" opacity="0.6"/>
    <line x1="${-r*0.12}" y1="${-r*0.35}" x2="${-r*0.28}" y2="${-r*0.35}" stroke="#4F46E5" stroke-width="${s*0.008}" opacity="0.6"/>
    <line x1="${r*0.22}" y1="${-r*0.35}" x2="${r*0.38}" y2="${-r*0.25}" stroke="#4F46E5" stroke-width="${s*0.008}" opacity="0.6"/>
    
    <!-- Small dot accents -->
    <circle cx="${r*0.05}" cy="${-r*0.05}" r="${r*0.03}" fill="#6366F1" opacity="0.7"/>
    <circle cx="${-r*0.28}" cy="${-r*0.35}" r="${r*0.03}" fill="#6366F1" opacity="0.7"/>
    <circle cx="${r*0.38}" cy="${-r*0.25}" r="${r*0.03}" fill="#6366F1" opacity="0.7"/>
    
    <!-- Lightbulb filament lines at bottom -->
    <line x1="${-r*0.1}" y1="${r*0.62}" x2="${r*0.02}" y2="${r*0.62}" stroke="#4F46E5" stroke-width="${s*0.008}" stroke-linecap="round" opacity="0.5"/>
    <line x1="${-r*0.08}" y1="${r*0.68}" x2="${r*0.0}" y2="${r*0.68}" stroke="#4F46E5" stroke-width="${s*0.008}" stroke-linecap="round" opacity="0.5"/>
  </g>
</svg>`;
};

// Foreground for adaptive icon (just the icon, no background)
const createForegroundSvg = (size) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.28;
  
  return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="100%" style="stop-color:#E0E7FF"/>
    </linearGradient>
  </defs>
  <g transform="translate(${cx}, ${cy})">
    <path d="M ${-r*0.42} ${-r*0.1}
             C ${-r*0.42} ${-r*0.65}, ${-r*0.15} ${-r*0.82}, ${r*0.05} ${-r*0.82}
             C ${r*0.35} ${-r*0.82}, ${r*0.5} ${-r*0.55}, ${r*0.5} ${-r*0.15}
             C ${r*0.5} ${r*0.1}, ${r*0.38} ${r*0.3}, ${r*0.22} ${r*0.42}
             L ${r*0.22} ${r*0.6}
             C ${r*0.22} ${r*0.68}, ${r*0.16} ${r*0.74}, ${r*0.08} ${r*0.74}
             L ${-r*0.18} ${r*0.74}
             C ${-r*0.26} ${r*0.74}, ${-r*0.32} ${r*0.68}, ${-r*0.32} ${r*0.6}
             L ${-r*0.32} ${r*0.45}
             C ${-r*0.42} ${r*0.25}, ${-r*0.42} ${r*0.05}, ${-r*0.42} ${-r*0.1} Z"
          fill="url(#glow)" opacity="0.95"/>
    <circle cx="${r*0.05}" cy="${-r*0.35}" r="${r*0.12}" fill="none" stroke="#4F46E5" stroke-width="${s*0.012}" opacity="0.8"/>
    <circle cx="${r*0.05}" cy="${-r*0.35}" r="${r*0.04}" fill="#4F46E5" opacity="0.9"/>
    <line x1="${r*0.05}" y1="${-r*0.23}" x2="${r*0.05}" y2="${-r*0.05}" stroke="#4F46E5" stroke-width="${s*0.008}" opacity="0.6"/>
    <line x1="${-r*0.12}" y1="${-r*0.35}" x2="${-r*0.28}" y2="${-r*0.35}" stroke="#4F46E5" stroke-width="${s*0.008}" opacity="0.6"/>
    <line x1="${r*0.22}" y1="${-r*0.35}" x2="${r*0.38}" y2="${-r*0.25}" stroke="#4F46E5" stroke-width="${s*0.008}" opacity="0.6"/>
    <circle cx="${r*0.05}" cy="${-r*0.05}" r="${r*0.03}" fill="#6366F1" opacity="0.7"/>
    <circle cx="${-r*0.28}" cy="${-r*0.35}" r="${r*0.03}" fill="#6366F1" opacity="0.7"/>
    <circle cx="${r*0.38}" cy="${-r*0.25}" r="${r*0.03}" fill="#6366F1" opacity="0.7"/>
    <line x1="${-r*0.1}" y1="${r*0.62}" x2="${r*0.02}" y2="${r*0.62}" stroke="#4F46E5" stroke-width="${s*0.008}" stroke-linecap="round" opacity="0.5"/>
    <line x1="${-r*0.08}" y1="${r*0.68}" x2="${r*0.0}" y2="${r*0.68}" stroke="#4F46E5" stroke-width="${s*0.008}" stroke-linecap="round" opacity="0.5"/>
  </g>
</svg>`;
};

// Background gradient for adaptive icon
const createBackgroundSvg = (size) => `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="50%" style="stop-color:#6366F1"/>
      <stop offset="100%" style="stop-color:#818CF8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
</svg>`;

// Monochrome (white silhouette)
const createMonochromeSvg = (size) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.28;
  
  return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${cx}, ${cy})">
    <path d="M ${-r*0.42} ${-r*0.1}
             C ${-r*0.42} ${-r*0.65}, ${-r*0.15} ${-r*0.82}, ${r*0.05} ${-r*0.82}
             C ${r*0.35} ${-r*0.82}, ${r*0.5} ${-r*0.55}, ${r*0.5} ${-r*0.15}
             C ${r*0.5} ${r*0.1}, ${r*0.38} ${r*0.3}, ${r*0.22} ${r*0.42}
             L ${r*0.22} ${r*0.6}
             C ${r*0.22} ${r*0.68}, ${r*0.16} ${r*0.74}, ${r*0.08} ${r*0.74}
             L ${-r*0.18} ${r*0.74}
             C ${-r*0.26} ${r*0.74}, ${-r*0.32} ${r*0.68}, ${-r*0.32} ${r*0.6}
             L ${-r*0.32} ${r*0.45}
             C ${-r*0.42} ${r*0.25}, ${-r*0.42} ${r*0.05}, ${-r*0.42} ${-r*0.1} Z"
          fill="white"/>
    <circle cx="${r*0.05}" cy="${-r*0.35}" r="${r*0.12}" fill="none" stroke="black" stroke-width="${s*0.012}" opacity="0.3"/>
    <circle cx="${r*0.05}" cy="${-r*0.35}" r="${r*0.04}" fill="black" opacity="0.3"/>
  </g>
</svg>`;
};

// Splash icon (larger, centered)
const createSplashSvg = (size) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.35;
  
  return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="100%" style="stop-color:#818CF8"/>
    </linearGradient>
  </defs>
  <!-- Outer glow ring -->
  <circle cx="${cx}" cy="${cy}" r="${r*1.15}" fill="none" stroke="#E0E7FF" stroke-width="${s*0.008}"/>
  <circle cx="${cx}" cy="${cy}" r="${r*1.3}" fill="none" stroke="#EEF2FF" stroke-width="${s*0.004}"/>
  
  <!-- Main circle -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#iconGrad)"/>
  
  <!-- Brain icon inside -->
  <g transform="translate(${cx}, ${cy})">
    <path d="M ${-r*0.32} ${-r*0.08}
             C ${-r*0.32} ${-r*0.5}, ${-r*0.12} ${-r*0.63}, ${r*0.04} ${-r*0.63}
             C ${r*0.27} ${-r*0.63}, ${r*0.38} ${-r*0.42}, ${r*0.38} ${-r*0.12}
             C ${r*0.38} ${r*0.08}, ${r*0.29} ${r*0.23}, ${r*0.17} ${r*0.32}
             L ${r*0.17} ${r*0.46}
             C ${r*0.17} ${r*0.52}, ${r*0.12} ${r*0.57}, ${r*0.06} ${r*0.57}
             L ${-r*0.14} ${r*0.57}
             C ${-r*0.2} ${r*0.57}, ${-r*0.25} ${r*0.52}, ${-r*0.25} ${r*0.46}
             L ${-r*0.25} ${r*0.35}
             C ${-r*0.32} ${r*0.2}, ${-r*0.32} ${r*0.04}, ${-r*0.32} ${-r*0.08} Z"
          fill="white" opacity="0.95"/>
    <circle cx="${r*0.04}" cy="${-r*0.27}" r="${r*0.09}" fill="none" stroke="#4F46E5" stroke-width="${s*0.01}" opacity="0.8"/>
    <circle cx="${r*0.04}" cy="${-r*0.27}" r="${r*0.03}" fill="#4F46E5" opacity="0.9"/>
    <line x1="${r*0.04}" y1="${-r*0.18}" x2="${r*0.04}" y2="${-r*0.04}" stroke="#4F46E5" stroke-width="${s*0.006}" opacity="0.6"/>
    <line x1="${-r*0.05}" y1="${-r*0.27}" x2="${-r*0.18}" y2="${-r*0.27}" stroke="#4F46E5" stroke-width="${s*0.006}" opacity="0.6"/>
    <line x1="${r*0.13}" y1="${-r*0.27}" x2="${r*0.25}" y2="${-r*0.19}" stroke="#4F46E5" stroke-width="${s*0.006}" opacity="0.6"/>
  </g>
</svg>`;
};

async function generate() {
  console.log('Generating icons...');
  
  // Main app icon (1024x1024)
  await sharp(Buffer.from(createIconSvg(1024)))
    .png().toFile(join(OUT, 'icon.png'));
  console.log('  icon.png');
  
  // Android adaptive icon foreground (1024x1024)
  await sharp(Buffer.from(createForegroundSvg(1024)))
    .png().toFile(join(OUT, 'android-icon-foreground.png'));
  console.log('  android-icon-foreground.png');
  
  // Android adaptive icon background (1024x1024)
  await sharp(Buffer.from(createBackgroundSvg(1024)))
    .png().toFile(join(OUT, 'android-icon-background.png'));
  console.log('  android-icon-background.png');
  
  // Monochrome icon (1024x1024)
  await sharp(Buffer.from(createMonochromeSvg(1024)))
    .png().toFile(join(OUT, 'android-icon-monochrome.png'));
  console.log('  android-icon-monochrome.png');
  
  // Splash icon (200px logical, generate at 512 for quality)
  await sharp(Buffer.from(createSplashSvg(512)))
    .png().toFile(join(OUT, 'splash-icon.png'));
  console.log('  splash-icon.png');
  
  // Favicon (48x48)
  await sharp(Buffer.from(createIconSvg(256)))
    .resize(48, 48)
    .png().toFile(join(OUT, 'favicon.png'));
  console.log('  favicon.png');
  
  console.log('All icons generated!');
}

generate().catch(console.error);
