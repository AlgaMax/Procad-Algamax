/**
 * ProCAD by AlgaMax - Fabric Defects & Plaid Matching
 */

import { Point, PatternPiece, PiecePlacement } from './types';
import { getBoundingBox } from './nesting';

export interface FabricDefect {
  id: string;
  type: 'hole' | 'stain' | 'tear' | 'weave_error' | 'color_variation' | 'custom';
  shape: 'rectangle' | 'circle' | 'polygon';
  position: Point;
  size: { width: number; height: number } | { radius: number } | { vertices: Point[] };
  severity: 'minor' | 'major' | 'critical';
  avoidanceMargin: number;
}

export interface DefectMap { fabricWidth: number; fabricLength: number; defects: FabricDefect[]; }

export interface PlaidPattern {
  id: string; name: string;
  horizontalRepeat: number; verticalRepeat: number;
  horizontalOffset: number; verticalOffset: number;
  matchingTolerance: number;
}

const genId = () => Math.random().toString(36).substr(2, 9);

export function createRectangleDefect(pos: Point, w: number, h: number, type: FabricDefect['type'] = 'custom', sev: FabricDefect['severity'] = 'major'): FabricDefect {
  return { id: genId(), type, shape: 'rectangle', position: pos, size: { width: w, height: h }, severity: sev, avoidanceMargin: sev === 'critical' ? 2 : sev === 'major' ? 1 : 0.5 };
}

export function createCircleDefect(center: Point, radius: number, type: FabricDefect['type'] = 'custom', sev: FabricDefect['severity'] = 'major'): FabricDefect {
  return { id: genId(), type, shape: 'circle', position: center, size: { radius }, severity: sev, avoidanceMargin: sev === 'critical' ? 2 : sev === 'major' ? 1 : 0.5 };
}

export function createPolygonDefect(vertices: Point[], type: FabricDefect['type'] = 'custom', sev: FabricDefect['severity'] = 'major'): FabricDefect {
  const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;
  return { id: genId(), type, shape: 'polygon', position: { x: cx, y: cy }, size: { vertices }, severity: sev, avoidanceMargin: sev === 'critical' ? 2 : sev === 'major' ? 1 : 0.5 };
}

function getPlacedVertices(piece: PatternPiece, placement: PiecePlacement): Point[] {
  let v = [...piece.vertices];
  if (placement.rotation !== 0) {
    const cx = v.reduce((s, p) => s + p.x, 0) / v.length;
    const cy = v.reduce((s, p) => s + p.y, 0) / v.length;
    const rad = placement.rotation * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    v = v.map(p => ({ x: cx + (p.x - cx) * cos - (p.y - cy) * sin, y: cy + (p.x - cx) * sin + (p.y - cy) * cos }));
  }
  const bbox = getBoundingBox(v);
  return v.map(p => ({ x: p.x - bbox.minX + placement.position.x, y: p.y - bbox.minY + placement.position.y }));
}

function pointInPoly(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i].y > pt.y) !== (poly[j].y > pt.y) && pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) inside = !inside;
  }
  return inside;
}

export function checkDefectCollision(piece: PatternPiece, placement: PiecePlacement, defectMap: DefectMap): { hasCollision: boolean; collidingDefects: FabricDefect[] } {
  const v = getPlacedVertices(piece, placement);
  const colliding: FabricDefect[] = [];
  
  for (const d of defectMap.defects) {
    const m = d.avoidanceMargin;
    if (d.shape === 'rectangle') {
      const s = d.size as { width: number; height: number };
      const rect = { minX: d.position.x - m, maxX: d.position.x + s.width + m, minY: d.position.y - m, maxY: d.position.y + s.height + m };
      const bbox = getBoundingBox(v);
      if (!(bbox.maxX < rect.minX || bbox.minX > rect.maxX || bbox.maxY < rect.minY || bbox.minY > rect.maxY)) {
        if (v.some(p => p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY)) colliding.push(d);
      }
    } else if (d.shape === 'circle') {
      const s = d.size as { radius: number };
      if (v.some(p => Math.hypot(p.x - d.position.x, p.y - d.position.y) <= s.radius + m)) colliding.push(d);
    } else if (d.shape === 'polygon') {
      const s = d.size as { vertices: Point[] };
      if (v.some(p => pointInPoly(p, s.vertices))) colliding.push(d);
    }
  }
  
  return { hasCollision: colliding.length > 0, collidingDefects: colliding };
}

export function createPlaidPattern(name: string, hRepeat: number, vRepeat: number, tolerance = 0.5): PlaidPattern {
  return { id: genId(), name, horizontalRepeat: hRepeat, verticalRepeat: vRepeat, horizontalOffset: 0, verticalOffset: 0, matchingTolerance: tolerance };
}

export function snapToPlaidGrid(pos: Point, pattern: PlaidPattern): Point {
  return {
    x: Math.round(pos.x / pattern.horizontalRepeat) * pattern.horizontalRepeat + pattern.horizontalOffset,
    y: Math.round(pos.y / pattern.verticalRepeat) * pattern.verticalRepeat + pattern.verticalOffset
  };
}

export function calculatePlaidAlignment(piece: PatternPiece, placement: PiecePlacement, pattern: PlaidPattern): number {
  const v = getPlacedVertices(piece, placement);
  let score = 0;
  for (const p of v) {
    const hOff = Math.abs(p.x % pattern.horizontalRepeat);
    const vOff = Math.abs(p.y % pattern.verticalRepeat);
    const hScore = Math.min(hOff, pattern.horizontalRepeat - hOff) / pattern.horizontalRepeat;
    const vScore = Math.min(vOff, pattern.verticalRepeat - vOff) / pattern.verticalRepeat;
    score += 1 - (hScore + vScore) / 2;
  }
  return score / v.length * 100;
}

export function findBestPlaidPosition(piece: PatternPiece, basePos: Point, pattern: PlaidPattern, searchRadius = 10): Point {
  let best = basePos, bestScore = 0;
  const steps = Math.ceil(searchRadius / Math.min(pattern.horizontalRepeat, pattern.verticalRepeat));
  
  for (let dx = -steps; dx <= steps; dx++) {
    for (let dy = -steps; dy <= steps; dy++) {
      const testPos = { x: basePos.x + dx * pattern.horizontalRepeat, y: basePos.y + dy * pattern.verticalRepeat };
      const placement: PiecePlacement = { pieceId: piece.id, position: testPos, rotation: 0, mirrored: false, isFixed: false, shrinkageApplied: false };
      const score = calculatePlaidAlignment(piece, placement, pattern);
      if (score > bestScore) { bestScore = score; best = testPos; }
    }
  }
  return best;
}

export { getPlacedVertices };
