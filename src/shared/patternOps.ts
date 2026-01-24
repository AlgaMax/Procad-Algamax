/**
 * ProCAD by AlgaMax - Pattern Operations
 * Complete pattern editing, drawing, and manipulation tools
 */

import { Point, PatternPiece, Notch, GrainLine, Dart, Pleat, BoundingBox } from './types';

// ============================================================================
// GEOMETRY UTILITIES
// ============================================================================

export function getBoundingBox(vertices: Point[]): BoundingBox {
  if (vertices.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function getCentroid(vertices: Point[]): Point {
  if (vertices.length === 0) return { x: 0, y: 0 };
  let sumX = 0, sumY = 0;
  for (const v of vertices) { sumX += v.x; sumY += v.y; }
  return { x: sumX / vertices.length, y: sumY / vertices.length };
}

export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = point.x - center.x, dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function scalePoint(point: Point, center: Point, scaleX: number, scaleY: number): Point {
  return { x: center.x + (point.x - center.x) * scaleX, y: center.y + (point.y - center.y) * scaleY };
}

export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function calculateAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

export function calculatePolygonArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

// ============================================================================
// POINT MANIPULATION
// ============================================================================

export function movePoint(pattern: PatternPiece, pointIndex: number, newPosition: Point): PatternPiece {
  const newVertices = [...pattern.vertices];
  newVertices[pointIndex] = { ...newPosition };
  return { ...pattern, vertices: newVertices };
}

export function movePoints(pattern: PatternPiece, pointIndices: number[], dx: number, dy: number): PatternPiece {
  const newVertices = pattern.vertices.map((v, i) => 
    pointIndices.includes(i) ? { x: v.x + dx, y: v.y + dy } : v
  );
  return { ...pattern, vertices: newVertices };
}

export function insertPoint(pattern: PatternPiece, afterIndex: number, point: Point): PatternPiece {
  const newVertices = [...pattern.vertices];
  newVertices.splice(afterIndex + 1, 0, point);
  return { ...pattern, vertices: newVertices };
}

export function deletePoint(pattern: PatternPiece, pointIndex: number): PatternPiece {
  if (pattern.vertices.length <= 3) throw new Error('Pattern must have at least 3 vertices');
  return { ...pattern, vertices: pattern.vertices.filter((_, i) => i !== pointIndex) };
}

// ============================================================================
// PATTERN TRANSFORMATION
// ============================================================================

export function resizePattern(pattern: PatternPiece, scaleX: number, scaleY: number, center?: Point): PatternPiece {
  const pivot = center || getCentroid(pattern.vertices);
  return {
    ...pattern,
    vertices: pattern.vertices.map(v => scalePoint(v, pivot, scaleX, scaleY)),
    notches: pattern.notches.map(n => ({ ...n, position: scalePoint(n.position, pivot, scaleX, scaleY) }))
  };
}

export function rotatePattern(pattern: PatternPiece, angleDeg: number, center?: Point): PatternPiece {
  const pivot = center || getCentroid(pattern.vertices);
  return {
    ...pattern,
    vertices: pattern.vertices.map(v => rotatePoint(v, pivot, angleDeg)),
    notches: pattern.notches.map(n => ({ ...n, position: rotatePoint(n.position, pivot, angleDeg) })),
    rotation: pattern.rotation + angleDeg
  };
}

export function mirrorPattern(pattern: PatternPiece, axis: 'x' | 'y', center?: Point): PatternPiece {
  const pivot = center || getCentroid(pattern.vertices);
  const newVertices = pattern.vertices.map(v => ({
    x: axis === 'y' ? 2 * pivot.x - v.x : v.x,
    y: axis === 'x' ? 2 * pivot.y - v.y : v.y
  }));
  return { ...pattern, vertices: newVertices, mirrored: !pattern.mirrored };
}

// ============================================================================
// CUT AND JOIN OPERATIONS
// ============================================================================

export function cutPatternStraight(pattern: PatternPiece, lineStart: Point, lineEnd: Point): PatternPiece[] {
  // Find intersections with pattern edges
  const intersections: { point: Point; edgeIndex: number }[] = [];
  
  for (let i = 0; i < pattern.vertices.length; i++) {
    const j = (i + 1) % pattern.vertices.length;
    const intersection = lineIntersection(lineStart, lineEnd, pattern.vertices[i], pattern.vertices[j]);
    if (intersection) intersections.push({ point: intersection, edgeIndex: i });
  }
  
  if (intersections.length !== 2) return [pattern];
  
  intersections.sort((a, b) => a.edgeIndex - b.edgeIndex);
  
  const piece1: Point[] = [], piece2: Point[] = [];
  let current = piece1;
  
  for (let i = 0; i < pattern.vertices.length; i++) {
    current.push(pattern.vertices[i]);
    if (i === intersections[0].edgeIndex) {
      current.push(intersections[0].point);
      piece2.push(intersections[0].point);
      current = piece2;
    }
    if (i === intersections[1].edgeIndex && current === piece2) {
      current.push(intersections[1].point);
      piece1.push(intersections[1].point);
      current = piece1;
    }
  }
  
  return [
    createPatternPiece(`${pattern.name}_1`, piece1),
    createPatternPiece(`${pattern.name}_2`, piece2)
  ];
}

export function joinPatterns(pattern1: PatternPiece, pattern2: PatternPiece, offset: Point): PatternPiece {
  const translated = pattern2.vertices.map(v => ({ x: v.x + offset.x, y: v.y + offset.y }));
  return createPatternPiece(`${pattern1.name}_${pattern2.name}`, [...pattern1.vertices, ...translated]);
}

// ============================================================================
// SEAM ALLOWANCE
// ============================================================================

export function addSeamAllowance(pattern: PatternPiece, width: number): PatternPiece {
  const offset = offsetPolygon(pattern.vertices, width);
  return { ...pattern, seamAllowance: { width, vertices: offset } };
}

export function offsetPolygon(vertices: Point[], distance: number): Point[] {
  const n = vertices.length;
  return vertices.map((curr, i) => {
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];
    
    const e1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const e2 = { x: next.x - curr.x, y: next.y - curr.y };
    const l1 = Math.sqrt(e1.x ** 2 + e1.y ** 2);
    const l2 = Math.sqrt(e2.x ** 2 + e2.y ** 2);
    
    const n1 = { x: -e1.y / l1, y: e1.x / l1 };
    const n2 = { x: -e2.y / l2, y: e2.x / l2 };
    const avg = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
    const len = Math.sqrt(avg.x ** 2 + avg.y ** 2);
    
    return { x: curr.x + avg.x * distance / len, y: curr.y + avg.y * distance / len };
  });
}

// ============================================================================
// NOTCH AND GRAIN LINE
// ============================================================================

export function addNotch(pattern: PatternPiece, position: Point, type: Notch['type'] = 'slit', depth = 0.5): PatternPiece {
  const notch: Notch = { id: generateId(), position, type, angle: 0, depth };
  return { ...pattern, notches: [...pattern.notches, notch] };
}

export function removeNotch(pattern: PatternPiece, notchId: string): PatternPiece {
  return { ...pattern, notches: pattern.notches.filter(n => n.id !== notchId) };
}

export function setGrainLine(pattern: PatternPiece, start: Point, end: Point): PatternPiece {
  return { ...pattern, grainLine: { start, end, angle: calculateAngle(start, end) } };
}

export function autoDetectGrainLine(pattern: PatternPiece): GrainLine {
  let maxLen = 0, bestEdge = 0;
  for (let i = 0; i < pattern.vertices.length; i++) {
    const len = calculateDistance(pattern.vertices[i], pattern.vertices[(i + 1) % pattern.vertices.length]);
    if (len > maxLen) { maxLen = len; bestEdge = i; }
  }
  const start = pattern.vertices[bestEdge];
  const end = pattern.vertices[(bestEdge + 1) % pattern.vertices.length];
  return { start, end, angle: calculateAngle(start, end) };
}

// ============================================================================
// DART OPERATIONS
// ============================================================================

export function createDart(pattern: PatternPiece, apex: Point, leg1: Point, leg2: Point, type: Dart['type'] = 'single'): { pattern: PatternPiece; dart: Dart } {
  const dart: Dart = {
    id: generateId(), apex, leg1, leg2,
    width: calculateDistance(leg1, leg2),
    depth: calculateDistance(apex, getCentroid([leg1, leg2])),
    type
  };
  
  const idx = findNearestEdge(pattern.vertices, getCentroid([leg1, leg2]));
  const newVertices = [...pattern.vertices];
  newVertices.splice(idx + 1, 0, leg1, apex, leg2);
  
  return { pattern: { ...pattern, vertices: newVertices }, dart };
}

export function moveDart(pattern: PatternPiece, dart: Dart, newApex: Point, newLeg1: Point, newLeg2: Point): { pattern: PatternPiece; dart: Dart } {
  const filtered = pattern.vertices.filter(v => 
    !pointsEqual(v, dart.apex) && !pointsEqual(v, dart.leg1) && !pointsEqual(v, dart.leg2)
  );
  return createDart({ ...pattern, vertices: filtered }, newApex, newLeg1, newLeg2, dart.type);
}

export function adjustDartWidth(pattern: PatternPiece, dart: Dart, newWidth: number): { pattern: PatternPiece; dart: Dart } {
  const center = getCentroid([dart.leg1, dart.leg2]);
  const dir = { x: dart.leg2.x - dart.leg1.x, y: dart.leg2.y - dart.leg1.y };
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
  const unit = { x: dir.x / len, y: dir.y / len };
  const half = newWidth / 2;
  
  return moveDart(pattern, dart, dart.apex,
    { x: center.x - unit.x * half, y: center.y - unit.y * half },
    { x: center.x + unit.x * half, y: center.y + unit.y * half }
  );
}

export function transferDart(pattern: PatternPiece, dart: Dart, newEdgeStart: Point, newEdgeEnd: Point): { pattern: PatternPiece; dart: Dart } {
  const mid = getCentroid([newEdgeStart, newEdgeEnd]);
  const dir = { x: newEdgeEnd.x - newEdgeStart.x, y: newEdgeEnd.y - newEdgeStart.y };
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
  const unit = { x: dir.x / len, y: dir.y / len };
  const perp = { x: -unit.y, y: unit.x };
  const half = dart.width / 2;
  
  return moveDart(pattern, dart,
    { x: mid.x + perp.x * dart.depth, y: mid.y + perp.y * dart.depth },
    { x: mid.x - unit.x * half, y: mid.y - unit.y * half },
    { x: mid.x + unit.x * half, y: mid.y + unit.y * half }
  );
}

// ============================================================================
// PLEAT OPERATIONS
// ============================================================================

export function createPleat(pattern: PatternPiece, position: Point, width: number, depth: number, type: Pleat['type'] = 'knife'): { pattern: PatternPiece; pleat: Pleat } {
  const pleat: Pleat = { id: generateId(), type, position, width, depth, direction: 'left', count: 1, spacing: 0 };
  const folds = calculatePleatFolds(pleat);
  const idx = findNearestEdge(pattern.vertices, position);
  const newVertices = [...pattern.vertices];
  newVertices.splice(idx + 1, 0, ...folds);
  return { pattern: { ...pattern, vertices: newVertices }, pleat };
}

export function createMultiPleats(pattern: PatternPiece, start: Point, end: Point, count: number, width: number, depth: number, type: Pleat['type'] = 'knife'): { pattern: PatternPiece; pleats: Pleat[] } {
  const dir = { x: end.x - start.x, y: end.y - start.y };
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
  const spacing = len / (count + 1);
  const unit = { x: dir.x / len, y: dir.y / len };
  
  let current = pattern;
  const pleats: Pleat[] = [];
  
  for (let i = 0; i < count; i++) {
    const pos = { x: start.x + unit.x * spacing * (i + 1), y: start.y + unit.y * spacing * (i + 1) };
    const result = createPleat(current, pos, width, depth, type);
    current = result.pattern;
    pleats.push(result.pleat);
  }
  
  return { pattern: current, pleats };
}

export function createRuffle(pattern: PatternPiece, startPoint: Point, endPoint: Point, gatherRatio: number): { pattern: PatternPiece; gatheredLength: number } {
  const originalLength = calculateDistance(startPoint, endPoint);
  const gatheredLength = originalLength / gatherRatio;
  const dir = { x: endPoint.x - startPoint.x, y: endPoint.y - startPoint.y };
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
  const unit = { x: dir.x / len, y: dir.y / len };
  const newEnd = { x: startPoint.x + unit.x * originalLength * gatherRatio, y: startPoint.y + unit.y * originalLength * gatherRatio };
  
  const newVertices = pattern.vertices.map(v => pointsEqual(v, endPoint) ? newEnd : v);
  return { pattern: { ...pattern, vertices: newVertices }, gatheredLength };
}

// ============================================================================
// DRAWING TOOLS
// ============================================================================

export function createLine(start: Point, end: Point): Point[] {
  return [start, end];
}

export function createBezierCurve(start: Point, c1: Point, c2: Point, end: Point, segments = 20): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    points.push({
      x: mt ** 3 * start.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * end.x,
      y: mt ** 3 * start.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * end.y
    });
  }
  return points;
}

export function createRectangle(topLeft: Point, width: number, height: number): Point[] {
  return [
    topLeft,
    { x: topLeft.x + width, y: topLeft.y },
    { x: topLeft.x + width, y: topLeft.y + height },
    { x: topLeft.x, y: topLeft.y + height }
  ];
}

export function createPolygon(center: Point, radius: number, sides: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
  }
  return points;
}

export function smoothFreehand(points: Point[], windowSize = 3): Point[] {
  if (points.length < windowSize) return points;
  const half = Math.floor(windowSize / 2);
  return points.map((_, i) => {
    let sx = 0, sy = 0, c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      sx += points[j].x; sy += points[j].y; c++;
    }
    return { x: sx / c, y: sy / c };
  });
}

export function simplifyPath(points: Point[], tolerance = 1): Point[] {
  if (points.length <= 2) return points;
  
  let maxDist = 0, maxIdx = 0;
  const first = points[0], last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToLineDistance(points[i], first, last);
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  
  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function createPatternPiece(name: string, vertices: Point[]): PatternPiece {
  return {
    id: generateId(), name, vertices, notches: [], gradePoints: [],
    quantity: 1, rotation: 0, mirrored: false, isLocked: false,
    priority: 0, allowedRotations: [0, 90, 180, 270]
  };
}

function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null;
  
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: p1.x + t * d1x, y: p1.y + t * d1y };
  }
  return null;
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x, dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return calculateDistance(point, lineStart);
  
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)));
  return calculateDistance(point, { x: lineStart.x + t * dx, y: lineStart.y + t * dy });
}

function findNearestEdge(vertices: Point[], point: Point): number {
  let minDist = Infinity, idx = 0;
  for (let i = 0; i < vertices.length; i++) {
    const dist = pointToLineDistance(point, vertices[i], vertices[(i + 1) % vertices.length]);
    if (dist < minDist) { minDist = dist; idx = i; }
  }
  return idx;
}

function pointsEqual(p1: Point, p2: Point, tol = 0.001): boolean {
  return Math.abs(p1.x - p2.x) < tol && Math.abs(p1.y - p2.y) < tol;
}

function calculatePleatFolds(pleat: Pleat): Point[] {
  const half = pleat.width / 2;
  const p = pleat.position;
  
  switch (pleat.type) {
    case 'knife': return [
      { x: p.x - half, y: p.y }, { x: p.x - half, y: p.y + pleat.depth },
      { x: p.x + half, y: p.y + pleat.depth }, { x: p.x + half, y: p.y }
    ];
    case 'box': return [
      { x: p.x - half, y: p.y }, { x: p.x - half / 2, y: p.y + pleat.depth },
      { x: p.x + half / 2, y: p.y + pleat.depth }, { x: p.x + half, y: p.y }
    ];
    case 'inverted': return [
      { x: p.x - half, y: p.y + pleat.depth }, { x: p.x, y: p.y },
      { x: p.x + half, y: p.y + pleat.depth }
    ];
    default: return [p];
  }
}

export { createPatternPiece, pointsEqual, pointToLineDistance, findNearestEdge };
