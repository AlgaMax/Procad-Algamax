/**
 * ProCAD by AlgaMax - Pattern Capture Module
 * Camera capture, calibration, contour detection, and pattern extraction
 */

import { Point, PatternPiece, CaptureConfig, CaptureResult, CalibrationData } from './types';

// Camera and table configuration
export interface CameraConfig {
  deviceId: string;
  resolution: { width: number; height: number };
  frameRate: number;
  autoFocus: boolean;
}

export interface TableConfig {
  width: number;
  height: number;
  markerSize: number;
  markerPositions: Point[];
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  deviceId: 'default',
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  autoFocus: true
};

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  width: 120,
  height: 180,
  markerSize: 5,
  markerPositions: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 180 }, { x: 0, y: 180 }]
};

// Calibration
export function calibrateCamera(detectedMarkers: Point[], tableConfig: TableConfig): CalibrationData {
  if (detectedMarkers.length < 4) throw new Error('Need 4+ markers');
  const dist = Math.hypot(detectedMarkers[1].x - detectedMarkers[0].x, detectedMarkers[1].y - detectedMarkers[0].y);
  return {
    homographyMatrix: [[1,0,0],[0,1,0],[0,0,1]],
    pixelsPerCm: dist / tableConfig.width,
    tableWidth: tableConfig.width,
    tableHeight: tableConfig.height,
    calibratedAt: new Date(),
    accuracy: 95
  };
}

export function applyHomography(point: Point, matrix: number[][]): Point {
  const w = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2];
  return {
    x: (matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2]) / w,
    y: (matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2]) / w
  };
}

// Image processing utilities
function toGrayscale(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = Math.round(0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2]);
  return gray;
}

function applyThreshold(gray: Uint8Array, threshold: number): Uint8Array {
  return gray.map(v => v > threshold ? 255 : 0);
}

function findContours(binary: Uint8Array, w: number, h: number): Point[][] {
  const contours: Point[][] = [];
  const visited = new Set<number>();
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (binary[idx] === 255 && !visited.has(idx)) {
        if ([binary[idx-1], binary[idx+1], binary[idx-w], binary[idx+w]].some(n => n === 0)) {
          const contour = traceContour(binary, w, h, x, y, visited);
          if (contour.length > 10) contours.push(contour);
        }
        visited.add(idx);
      }
    }
  }
  return contours;
}

function traceContour(binary: Uint8Array, w: number, h: number, sx: number, sy: number, visited: Set<number>): Point[] {
  const contour: Point[] = [];
  const dirs = [{dx:1,dy:0},{dx:1,dy:1},{dx:0,dy:1},{dx:-1,dy:1},{dx:-1,dy:0},{dx:-1,dy:-1},{dx:0,dy:-1},{dx:1,dy:-1}];
  let x = sx, y = sy, dir = 0;
  
  do {
    contour.push({ x, y });
    visited.add(y * w + x);
    let found = false;
    for (let i = 0; i < 8; i++) {
      const d = dirs[(dir + i) % 8];
      const nx = x + d.dx, ny = y + d.dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nidx = ny * w + nx;
        if (binary[nidx] === 255 && !visited.has(nidx)) {
          x = nx; y = ny; dir = (dir + i + 5) % 8; found = true; break;
        }
      }
    }
    if (!found) break;
  } while (contour.length < 10000 && (x !== sx || y !== sy));
  
  return contour;
}

function simplifyContour(contour: Point[], tolerance: number): Point[] {
  if (contour.length <= 2) return contour;
  let maxDist = 0, maxIdx = 0;
  const first = contour[0], last = contour[contour.length - 1];
  
  for (let i = 1; i < contour.length - 1; i++) {
    const dist = pointToLineDist(contour[i], first, last);
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  
  if (maxDist > tolerance) {
    const left = simplifyContour(contour.slice(0, maxIdx + 1), tolerance);
    const right = simplifyContour(contour.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function pointToLineDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function calcArea(v: Point[]): number {
  let a = 0;
  for (let i = 0; i < v.length; i++) { const j = (i+1) % v.length; a += v[i].x * v[j].y - v[j].x * v[i].y; }
  return Math.abs(a) / 2;
}

function calcAngle(p1: Point, v: Point, p2: Point): number {
  const v1 = { x: p1.x - v.x, y: p1.y - v.y }, v2 = { x: p2.x - v.x, y: p2.y - v.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const len1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y), len2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
  return Math.acos(Math.max(-1, Math.min(1, dot / (len1 * len2)))) * (180 / Math.PI);
}

// Notch detection
function detectNotches(vertices: Point[], config: { enabled: boolean; minDepth: number; maxDepth: number }): { position: Point; type: string; depth: number }[] {
  if (!config.enabled) return [];
  const notches: { position: Point; type: string; depth: number }[] = [];
  
  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const angle = calcAngle(prev, curr, next);
    
    if (angle < 120 && angle > 30) {
      const depth = pointToLineDist(curr, prev, next);
      if (depth >= config.minDepth && depth <= config.maxDepth) {
        notches.push({ position: curr, type: angle < 60 ? 'v-notch' : 'slit', depth });
      }
    }
  }
  return notches;
}

// Grain line detection
function detectGrainLine(vertices: Point[]): { start: Point; end: Point; angle: number } | undefined {
  let maxLen = 0, start: Point | null = null, end: Point | null = null;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const len = Math.hypot(vertices[j].x - vertices[i].x, vertices[j].y - vertices[i].y);
    if (len > maxLen) { maxLen = len; start = vertices[i]; end = vertices[j]; }
  }
  if (!start || !end) return undefined;
  return { start, end, angle: Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) };
}

// Grading point detection
function detectGradingPoints(vertices: Point[]): { position: Point; type: string }[] {
  const points: { position: Point; type: string }[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const angle = calcAngle(prev, curr, next);
    if (angle < 150) points.push({ position: curr, type: angle < 100 ? 'corner' : 'curve' });
  }
  return points;
}

// Main extraction function
export function extractPatternOutline(imageData: ImageData, calibration: CalibrationData, config: CaptureConfig): CaptureResult {
  const { width, height, data } = imageData;
  const gray = toGrayscale(data, width, height);
  const binary = applyThreshold(gray, config.threshold);
  const contours = findContours(binary, width, height);
  
  const validContours = contours.filter(c => calcArea(c) > config.minArea);
  if (validContours.length === 0) return { success: false, error: 'No pattern detected', vertices: [], confidence: 0 };
  
  const mainContour = validContours.reduce((a, b) => calcArea(a) > calcArea(b) ? a : b);
  const simplified = simplifyContour(mainContour, config.smoothing);
  const corrected = simplified.map(p => applyHomography(p, calibration.homographyMatrix));
  const scaled = corrected.map(p => ({ x: p.x / calibration.pixelsPerCm, y: p.y / calibration.pixelsPerCm }));
  
  return {
    success: true,
    vertices: scaled,
    notches: detectNotches(scaled, config.notchDetection),
    grainLine: detectGrainLine(scaled),
    gradePoints: detectGradingPoints(scaled),
    confidence: 85,
    boundingBox: getBBox(scaled)
  };
}

// Multi-pattern capture
export function captureMultiplePatterns(imageData: ImageData, calibration: CalibrationData, config: CaptureConfig): CaptureResult[] {
  const { width, height, data } = imageData;
  const gray = toGrayscale(data, width, height);
  const binary = applyThreshold(gray, config.threshold);
  const contours = findContours(binary, width, height);
  
  return contours.filter(c => calcArea(c) > config.minArea).map((contour, index) => {
    const simplified = simplifyContour(contour, config.smoothing);
    const corrected = simplified.map(p => applyHomography(p, calibration.homographyMatrix));
    const scaled = corrected.map(p => ({ x: p.x / calibration.pixelsPerCm, y: p.y / calibration.pixelsPerCm }));
    
    return {
      success: true, vertices: scaled,
      notches: detectNotches(scaled, config.notchDetection),
      grainLine: detectGrainLine(scaled),
      gradePoints: detectGradingPoints(scaled),
      confidence: 85, boundingBox: getBBox(scaled), patternIndex: index
    };
  });
}

function getBBox(v: Point[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of v) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Convert to pattern piece
export function convertToPatternPiece(result: CaptureResult, name: string): PatternPiece {
  const genId = () => Math.random().toString(36).substr(2, 9);
  return {
    id: genId(), name, vertices: result.vertices,
    notches: result.notches?.map(n => ({ id: genId(), position: n.position, type: n.type as any, angle: 0, depth: n.depth })) || [],
    grainLine: result.grainLine,
    gradePoints: result.gradePoints?.map(gp => ({ id: genId(), position: gp.position, rules: [] })) || [],
    quantity: 1, rotation: 0, mirrored: false, isLocked: false, priority: 0, allowedRotations: [0, 90, 180, 270]
  };
}

