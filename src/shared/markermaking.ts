/**
 * ProCAD by AlgaMax - Marker Making Module
 * Complete marker creation, multi-size nesting, and reporting
 */

import { Point, PatternPiece, MarkerConfig, MarkerSizeConfig, MarkerReport, NestingConfig } from './types';
import { autoNest, getBoundingBox, calculateArea } from './nesting';
import { applyGrading, STANDARD_SIZES } from './grading';

// ============================================================================
// MARKER CREATION
// ============================================================================

/**
 * Create a new marker configuration
 */
export function createMarker(
  name: string,
  styleName: string,
  fabricWidth: number,
  sizes: MarkerSizeConfig[]
): MarkerConfig {
  return {
    id: generateId(),
    name,
    styleName,
    description: '',
    fabricWidth,
    fabricType: 'Cotton',
    sizes,
    nestingConfig: {
      fabricWidth,
      spacing: 1,
      rotationAngles: [0, 90, 180, 270],
      allowMirror: false,
      grainDirection: true,
      shrinkageX: 0,
      shrinkageY: 0
    }
  };
}

/**
 * Update marker configuration
 */
export function updateMarker(
  marker: MarkerConfig,
  updates: Partial<MarkerConfig>
): MarkerConfig {
  return { ...marker, ...updates };
}

// ============================================================================
// MULTI-SIZE NESTING
// ============================================================================

/**
 * Generate pieces for all sizes in marker
 */
export function generateMultiSizePieces(
  basePatterns: PatternPiece[],
  sizeConfig: MarkerSizeConfig[]
): PatternPiece[] {
  const allPieces: PatternPiece[] = [];
  
  for (const config of sizeConfig) {
    for (let i = 0; i < config.quantity; i++) {
      for (const pattern of basePatterns) {
        const graded = applyGrading(pattern, config.size);
        allPieces.push({
          ...graded,
          id: `${pattern.id}_${config.size}_${i}`,
          name: `${pattern.name} (${config.size})`
        });
      }
    }
  }
  
  return allPieces;
}

/**
 * Nest marker with multi-size pieces
 */
export function nestMarker(
  basePatterns: PatternPiece[],
  marker: MarkerConfig
): { placements: any[]; efficiency: number; markerLength: number; report: MarkerReport } {
  // Generate all pieces for all sizes
  const allPieces = generateMultiSizePieces(basePatterns, marker.sizes);
  
  // Run nesting
  const result = autoNest(allPieces, marker.nestingConfig);
  
  // Generate report
  const report = generateMarkerReport(marker, basePatterns, result);
  
  return {
    placements: result.placements,
    efficiency: result.efficiency,
    markerLength: result.markerLength,
    report
  };
}

// ============================================================================
// MARKER EFFICIENCY REPORT
// ============================================================================

/**
 * Generate comprehensive marker report
 */
export function generateMarkerReport(
  marker: MarkerConfig,
  basePatterns: PatternPiece[],
  nestingResult: { efficiency: number; markerLength: number; totalArea: number; fabricUsed: number }
): MarkerReport {
  // Calculate pieces by size
  const piecesBySize: Record<string, number> = {};
  for (const config of marker.sizes) {
    piecesBySize[config.size] = config.quantity * basePatterns.length;
  }
  
  // Calculate total pieces
  const totalPieces = Object.values(piecesBySize).reduce((sum, count) => sum + count, 0);
  
  // Calculate consumption metrics
  const totalFabricUsed = nestingResult.fabricUsed / 10000; // Convert to sq meters
  const consumptionPerPiece = totalFabricUsed / totalPieces;
  
  // Calculate bundle consumption (assuming standard bundle = 12 pieces)
  const bundleSize = 12;
  const consumptionPerBundle = consumptionPerPiece * bundleSize;
  
  return {
    markerId: marker.id,
    styleName: marker.styleName,
    description: marker.description,
    fabricWidth: marker.fabricWidth,
    markerLength: nestingResult.markerLength,
    efficiency: nestingResult.efficiency,
    wastePercentage: 100 - nestingResult.efficiency,
    totalPieces,
    piecesBySize,
    consumptionPerPiece,
    consumptionPerBundle,
    totalFabricUsed,
    generatedAt: new Date()
  };
}

/**
 * Format marker report as text
 */
export function formatMarkerReportText(report: MarkerReport): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    MARKER EFFICIENCY REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Style Name:           ${report.styleName}`,
    `Description:          ${report.description || 'N/A'}`,
    `Generated:            ${report.generatedAt.toLocaleString()}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                      FABRIC DETAILS',
    '───────────────────────────────────────────────────────────────',
    '',
    `Fabric Width:         ${report.fabricWidth} cm`,
    `Marker Length:        ${report.markerLength.toFixed(2)} cm`,
    `Total Fabric Used:    ${report.totalFabricUsed.toFixed(4)} sq m`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                      EFFICIENCY METRICS',
    '───────────────────────────────────────────────────────────────',
    '',
    `Fabric Utilization:   ${report.efficiency.toFixed(2)}%`,
    `Waste Percentage:     ${report.wastePercentage.toFixed(2)}%`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                      PIECE BREAKDOWN',
    '───────────────────────────────────────────────────────────────',
    '',
    `Total Pieces:         ${report.totalPieces}`,
    '',
    'Pieces by Size:',
  ];
  
  for (const [size, count] of Object.entries(report.piecesBySize)) {
    lines.push(`  ${size.padEnd(10)} ${count} pieces`);
  }
  
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                      CONSUMPTION DATA');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`Avg. per Piece:       ${(report.consumptionPerPiece * 10000).toFixed(2)} sq cm`);
  lines.push(`Avg. per Bundle:      ${(report.consumptionPerBundle * 10000).toFixed(2)} sq cm`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

/**
 * Format marker report as HTML
 */
export function formatMarkerReportHTML(report: MarkerReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Marker Report - ${report.styleName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #007bff; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .metric { font-size: 24px; font-weight: bold; color: #007bff; }
    .efficiency-good { color: #28a745; }
    .efficiency-ok { color: #ffc107; }
    .efficiency-poor { color: #dc3545; }
    .summary-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Marker Efficiency Report</h1>
  
  <div class="summary-box">
    <h2>Summary</h2>
    <p><strong>Style:</strong> ${report.styleName}</p>
    <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
    <p class="metric ${report.efficiency >= 80 ? 'efficiency-good' : report.efficiency >= 70 ? 'efficiency-ok' : 'efficiency-poor'}">
      Efficiency: ${report.efficiency.toFixed(2)}%
    </p>
  </div>
  
  <h2>Fabric Details</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Fabric Width</td><td>${report.fabricWidth} cm</td></tr>
    <tr><td>Marker Length</td><td>${report.markerLength.toFixed(2)} cm</td></tr>
    <tr><td>Total Fabric Used</td><td>${report.totalFabricUsed.toFixed(4)} sq m</td></tr>
    <tr><td>Waste</td><td>${report.wastePercentage.toFixed(2)}%</td></tr>
  </table>
  
  <h2>Piece Breakdown</h2>
  <table>
    <tr><th>Size</th><th>Quantity</th></tr>
    ${Object.entries(report.piecesBySize).map(([size, count]) => 
      `<tr><td>${size}</td><td>${count}</td></tr>`
    ).join('')}
    <tr><th>Total</th><th>${report.totalPieces}</th></tr>
  </table>
  
  <h2>Consumption Data</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Average per Piece</td><td>${(report.consumptionPerPiece * 10000).toFixed(2)} sq cm</td></tr>
    <tr><td>Average per Bundle (12 pcs)</td><td>${(report.consumptionPerBundle * 10000).toFixed(2)} sq cm</td></tr>
  </table>
  
  <footer style="margin-top: 40px; color: #666; font-size: 12px;">
    Generated by ProCAD by AlgaMax
  </footer>
</body>
</html>`;
}

// ============================================================================
// FABRIC WIDTH SETTINGS
// ============================================================================

export const STANDARD_FABRIC_WIDTHS = [
  { width: 90, name: '90cm (36")' },
  { width: 110, name: '110cm (44")' },
  { width: 115, name: '115cm (45")' },
  { width: 140, name: '140cm (55")' },
  { width: 150, name: '150cm (60")' },
  { width: 160, name: '160cm (63")' },
  { width: 180, name: '180cm (72")' }
];

/**
 * Get optimal fabric width for pieces
 */
export function suggestFabricWidth(pieces: PatternPiece[]): number {
  const maxPieceWidth = Math.max(...pieces.map(p => getBoundingBox(p.vertices).width));
  
  for (const fabric of STANDARD_FABRIC_WIDTHS) {
    if (fabric.width >= maxPieceWidth + 5) { // 5cm margin
      return fabric.width;
    }
  }
  
  return 150; // Default
}

// ============================================================================
// SIZE RATIO PRESETS
// ============================================================================

export const SIZE_RATIO_PRESETS = {
  'standard': [
    { size: 'S', ratio: 1 },
    { size: 'M', ratio: 2 },
    { size: 'L', ratio: 2 },
    { size: 'XL', ratio: 1 }
  ],
  'plus-focus': [
    { size: 'L', ratio: 1 },
    { size: 'XL', ratio: 2 },
    { size: '2XL', ratio: 2 },
    { size: '3XL', ratio: 1 }
  ],
  'full-range': [
    { size: 'XS', ratio: 1 },
    { size: 'S', ratio: 2 },
    { size: 'M', ratio: 3 },
    { size: 'L', ratio: 3 },
    { size: 'XL', ratio: 2 },
    { size: '2XL', ratio: 1 }
  ],
  'single-size': (size: string) => [{ size, ratio: 1 }]
};

/**
 * Generate size config from ratio preset
 */
export function generateSizeConfig(
  preset: keyof typeof SIZE_RATIO_PRESETS | string,
  totalQuantity: number
): MarkerSizeConfig[] {
  let ratios: { size: string; ratio: number }[];
  
  if (preset in SIZE_RATIO_PRESETS) {
    const presetValue = SIZE_RATIO_PRESETS[preset as keyof typeof SIZE_RATIO_PRESETS];
    ratios = typeof presetValue === 'function' ? presetValue(preset) : presetValue;
  } else {
    ratios = SIZE_RATIO_PRESETS['single-size'](preset);
  }
  
  const totalRatio = ratios.reduce((sum, r) => sum + r.ratio, 0);
  
  return ratios.map(r => ({
    size: r.size,
    quantity: Math.round((r.ratio / totalRatio) * totalQuantity),
    ratio: r.ratio
  }));
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export { STANDARD_SIZES };
