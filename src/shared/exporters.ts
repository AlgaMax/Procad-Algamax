/**
 * ProCAD by AlgaMax - Export Formats (HPGL, PLT, DXF, SVG, PDF)
 */

import { Point, PatternPiece, PiecePlacement } from './types';
import { getBoundingBox } from './nesting';

function getPlacedVerts(piece: PatternPiece, pl: PiecePlacement, scale: number): Point[] {
  let v = [...piece.vertices];
  if (pl.rotation !== 0) {
    const cx = v.reduce((s, p) => s + p.x, 0) / v.length, cy = v.reduce((s, p) => s + p.y, 0) / v.length;
    const rad = pl.rotation * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    v = v.map(p => ({ x: cx + (p.x - cx) * cos - (p.y - cy) * sin, y: cy + (p.x - cx) * sin + (p.y - cy) * cos }));
  }
  const bbox = getBoundingBox(v);
  return v.map(p => ({ x: (p.x - bbox.minX + pl.position.x) * scale, y: (p.y - bbox.minY + pl.position.y) * scale }));
}

function transformPt(pt: Point, pl: PiecePlacement, scale: number): Point {
  let p = { ...pt };
  if (pl.rotation !== 0) {
    const rad = pl.rotation * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    p = { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
  }
  return { x: (p.x + pl.position.x) * scale, y: (p.y + pl.position.y) * scale };
}

export function exportToHPGL(pieces: PatternPiece[], placements: PiecePlacement[], scale = 40): string {
  let hpgl = 'IN;SP1;';
  for (const pl of placements) {
    const piece = pieces.find(p => p.id === pl.pieceId || p.id.startsWith(pl.pieceId.split('_')[0]));
    if (!piece) continue;
    const v = getPlacedVerts(piece, pl, scale);
    if (v.length === 0) continue;
    hpgl += `PU${Math.round(v[0].x)},${Math.round(v[0].y)};PD`;
    for (let i = 1; i < v.length; i++) hpgl += `${Math.round(v[i].x)},${Math.round(v[i].y)},`;
    hpgl += `${Math.round(v[0].x)},${Math.round(v[0].y)};PU;`;
    for (const n of piece.notches) { const pos = transformPt(n.position, pl, scale); hpgl += `PU${Math.round(pos.x)},${Math.round(pos.y)};PD${Math.round(pos.x)},${Math.round(pos.y - 5 * scale)};PU;`; }
  }
  return hpgl + 'SP0;';
}

export function exportToPLT(pieces: PatternPiece[], placements: PiecePlacement[], scale = 40): string {
  return 'IN;VS10;SP1;' + exportToHPGL(pieces, placements, scale).replace('IN;SP1;', '').replace('SP0;', '') + 'SP0;PG;';
}

export function exportToDXF(pieces: PatternPiece[], placements: PiecePlacement[]): string {
  let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  for (const pl of placements) {
    const piece = pieces.find(p => p.id === pl.pieceId || p.id.startsWith(pl.pieceId.split('_')[0]));
    if (!piece) continue;
    const v = getPlacedVerts(piece, pl, 1);
    dxf += '0\nLWPOLYLINE\n8\n0\n70\n1\n90\n' + v.length + '\n';
    for (const p of v) dxf += '10\n' + p.x.toFixed(4) + '\n20\n' + p.y.toFixed(4) + '\n';
    for (const n of piece.notches) { const pos = transformPt(n.position, pl, 1); dxf += '0\nLINE\n8\n0\n10\n' + pos.x.toFixed(4) + '\n20\n' + pos.y.toFixed(4) + '\n11\n' + pos.x.toFixed(4) + '\n21\n' + (pos.y - 0.5).toFixed(4) + '\n'; }
    if (piece.grainLine) { const s = transformPt(piece.grainLine.start, pl, 1), e = transformPt(piece.grainLine.end, pl, 1); dxf += '0\nLINE\n8\nGRAIN\n10\n' + s.x.toFixed(4) + '\n20\n' + s.y.toFixed(4) + '\n11\n' + e.x.toFixed(4) + '\n21\n' + e.y.toFixed(4) + '\n'; }
  }
  return dxf + '0\nENDSEC\n0\nEOF\n';
}

export function exportToSVG(pieces: PatternPiece[], placements: PiecePlacement[], fabricWidth: number, markerLength: number): string {
  const pad = 10, w = fabricWidth + pad * 2, h = markerLength + pad * 2;
  let svg = `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n`;
  svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="white"/>\n<rect x="${pad}" y="${pad}" width="${fabricWidth}" height="${markerLength}" fill="none" stroke="#ccc" stroke-width="0.5"/>\n`;
  for (const pl of placements) {
    const piece = pieces.find(p => p.id === pl.pieceId || p.id.startsWith(pl.pieceId.split('_')[0]));
    if (!piece) continue;
    const v = getPlacedVerts(piece, pl, 1);
    const pts = v.map(p => `${(p.x + pad).toFixed(2)},${(p.y + pad).toFixed(2)}`).join(' ');
    svg += `<polygon points="${pts}" fill="none" stroke="#333" stroke-width="0.3"/>\n`;
    for (const n of piece.notches) { const pos = transformPt(n.position, pl, 1); svg += `<line x1="${pos.x + pad}" y1="${pos.y + pad}" x2="${pos.x + pad}" y2="${pos.y + pad - 0.5}" stroke="#666" stroke-width="0.2"/>\n`; }
    if (piece.grainLine) { const s = transformPt(piece.grainLine.start, pl, 1), e = transformPt(piece.grainLine.end, pl, 1); svg += `<line x1="${s.x + pad}" y1="${s.y + pad}" x2="${e.x + pad}" y2="${e.y + pad}" stroke="#999" stroke-width="0.2" stroke-dasharray="2,1"/>\n`; }
    const bbox = getBoundingBox(v); svg += `<text x="${bbox.minX + bbox.width/2 + pad}" y="${bbox.minY + bbox.height/2 + pad}" font-size="2" text-anchor="middle" fill="#666">${piece.name}</text>\n`;
  }
  return svg + '</svg>';
}

export function exportToPDFData(pieces: PatternPiece[], placements: PiecePlacement[], fabricWidth: number, markerLength: number): { svg: string; width: number; height: number } {
  return { svg: exportToSVG(pieces, placements, fabricWidth, markerLength), width: fabricWidth + 20, height: markerLength + 20 };
}

export function exportPieceToSVG(piece: PatternPiece, scale = 1): string {
  const bbox = getBoundingBox(piece.vertices), pad = 5, w = bbox.width * scale + pad * 2, h = bbox.height * scale + pad * 2;
  let svg = `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n`;
  const pts = piece.vertices.map(v => `${((v.x - bbox.minX) * scale + pad).toFixed(2)},${((v.y - bbox.minY) * scale + pad).toFixed(2)}`).join(' ');
  svg += `<polygon points="${pts}" fill="none" stroke="#333" stroke-width="0.3"/>\n`;
  if (piece.seamAllowance) { const saPts = piece.seamAllowance.vertices.map(v => `${((v.x - bbox.minX) * scale + pad).toFixed(2)},${((v.y - bbox.minY) * scale + pad).toFixed(2)}`).join(' '); svg += `<polygon points="${saPts}" fill="none" stroke="#999" stroke-width="0.2" stroke-dasharray="1,1"/>\n`; }
  for (const n of piece.notches) { const x = (n.position.x - bbox.minX) * scale + pad, y = (n.position.y - bbox.minY) * scale + pad; svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 3}" stroke="#666" stroke-width="0.2"/>\n`; }
  if (piece.grainLine) { const x1 = (piece.grainLine.start.x - bbox.minX) * scale + pad, y1 = (piece.grainLine.start.y - bbox.minY) * scale + pad, x2 = (piece.grainLine.end.x - bbox.minX) * scale + pad, y2 = (piece.grainLine.end.y - bbox.minY) * scale + pad; svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#999" stroke-width="0.2" stroke-dasharray="2,1"/>\n`; }
  return svg + `<text x="${w/2}" y="${h - 2}" font-size="3" text-anchor="middle" fill="#333">${piece.name}</text>\n</svg>`;
}

export function exportPieceToDXF(piece: PatternPiece): string {
  let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  dxf += '0\nLWPOLYLINE\n8\nOUTLINE\n70\n1\n90\n' + piece.vertices.length + '\n';
  for (const v of piece.vertices) dxf += '10\n' + v.x.toFixed(4) + '\n20\n' + v.y.toFixed(4) + '\n';
  if (piece.seamAllowance) { dxf += '0\nLWPOLYLINE\n8\nSEAM\n70\n1\n90\n' + piece.seamAllowance.vertices.length + '\n'; for (const v of piece.seamAllowance.vertices) dxf += '10\n' + v.x.toFixed(4) + '\n20\n' + v.y.toFixed(4) + '\n'; }
  return dxf + '0\nENDSEC\n0\nEOF\n';
}
