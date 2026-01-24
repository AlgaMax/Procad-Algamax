/**
 * ProCAD by AlgaMax - Tech Pack Generation
 */

import { PatternPiece, NestingResult } from './types';
import { STANDARD_SIZES } from './grading';

export interface TechPackConfig { styleName: string; styleNumber: string; season: string; designer: string; date: Date; }
export interface PieceSpec { name: string; quantity: number; area: number; perimeter: number; notchCount: number; gradePointCount: number; hasGrainLine: boolean; }
export interface GradingSpec { baseSize: string; sizeRange: string[]; growthX: number; growthY: number; }
export interface MarkerSpec { fabricWidth: number; markerLength: number; efficiency: number; pieceCount: number; }
export interface TechPack { config: TechPackConfig; pieceSpecs: PieceSpec[]; gradingSpec: GradingSpec; markerSpec: MarkerSpec; generatedAt: Date; }

function calcArea(v: { x: number; y: number }[]): number {
  let a = 0; for (let i = 0; i < v.length; i++) { const j = (i + 1) % v.length; a += v[i].x * v[j].y - v[j].x * v[i].y; } return Math.abs(a) / 2;
}

function calcPerimeter(v: { x: number; y: number }[]): number {
  let p = 0; for (let i = 0; i < v.length; i++) { const j = (i + 1) % v.length; p += Math.hypot(v[j].x - v[i].x, v[j].y - v[i].y); } return p;
}

export function generatePieceSpec(piece: PatternPiece): PieceSpec {
  return { name: piece.name, quantity: piece.quantity, area: calcArea(piece.vertices), perimeter: calcPerimeter(piece.vertices), notchCount: piece.notches.length, gradePointCount: piece.gradePoints.length, hasGrainLine: !!piece.grainLine };
}

export function generateGradingSpec(pieces: PatternPiece[], sizeRange: string[]): GradingSpec {
  const baseSize = STANDARD_SIZES.find(s => s.baseSize)?.name || 'M';
  return { baseSize, sizeRange, growthX: 0.5, growthY: 0.3 };
}

export function generateMarkerSpec(result: NestingResult, fabricWidth: number): MarkerSpec {
  return { fabricWidth, markerLength: result.markerLength, efficiency: result.efficiency, pieceCount: result.placements.length };
}

export function generateTechPack(config: TechPackConfig, pieces: PatternPiece[], result: NestingResult, fabricWidth: number, sizeRange: string[]): TechPack {
  return { config, pieceSpecs: pieces.map(generatePieceSpec), gradingSpec: generateGradingSpec(pieces, sizeRange), markerSpec: generateMarkerSpec(result, fabricWidth), generatedAt: new Date() };
}

export function formatTechPackText(tp: TechPack): string {
  const { config: c, pieceSpecs: ps, gradingSpec: g, markerSpec: m } = tp;
  let t = `TECH PACK: ${c.styleName} (${c.styleNumber})\nSeason: ${c.season} | Designer: ${c.designer}\n\nPIECES:\n`;
  ps.forEach(p => t += `- ${p.name}: ${p.area.toFixed(0)}cm², ${p.notchCount} notches\n`);
  t += `\nGRADING: Base ${g.baseSize}, Range: ${g.sizeRange.join('-')}\nMARKER: ${m.fabricWidth}cm × ${m.markerLength.toFixed(0)}cm, ${m.efficiency.toFixed(1)}% eff`;
  return t;
}

export function formatTechPackHTML(tp: TechPack): string {
  const { config: c, pieceSpecs: ps, gradingSpec: g, markerSpec: m } = tp;
  return `<!DOCTYPE html><html><head><title>Tech Pack</title><style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#007bff;color:white}</style></head><body><h1>${c.styleName}</h1><p>${c.styleNumber} | ${c.season} | ${c.designer}</p><h2>Pieces</h2><table><tr><th>Name</th><th>Area</th><th>Notches</th></tr>${ps.map(p=>`<tr><td>${p.name}</td><td>${p.area.toFixed(0)}cm²</td><td>${p.notchCount}</td></tr>`).join('')}</table><h2>Grading</h2><p>Base: ${g.baseSize} | Range: ${g.sizeRange.join(', ')}</p><h2>Marker</h2><p>${m.fabricWidth}×${m.markerLength.toFixed(0)}cm | ${m.efficiency.toFixed(1)}%</p></body></html>`;
}

export function formatTechPackJSON(tp: TechPack): string { return JSON.stringify(tp, null, 2); }
