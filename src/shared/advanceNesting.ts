/**
 * ProCAD by AlgaMax - Advanced Nesting Features
 * Size orientation, piece constraints, blocks, and priority nesting
 */

import { Point, PatternPiece, NestingConfig, PiecePlacement } from './types';
import { autoNest, getBoundingBox, rotateVertices, translateVertices } from './nesting';

// ============================================================================
// SIZE ORIENTATION CONTROL
// ============================================================================

export type SizeOrientation = 'horizontal' | 'vertical' | 'mixed' | 'alternating';

export interface SizeOrientationConfig {
  orientation: SizeOrientation;
  sizeOrder: string[];
  groupBySize: boolean;
}

/**
 * Apply size orientation to pieces before nesting
 */
export function applySizeOrientation(
  pieces: PatternPiece[],
  config: SizeOrientationConfig
): PatternPiece[] {
  const { orientation, sizeOrder, groupBySize } = config;
  
  // Sort pieces by size order
  const sorted = [...pieces].sort((a, b) => {
    const sizeA = extractSize(a.name);
    const sizeB = extractSize(b.name);
    return sizeOrder.indexOf(sizeA) - sizeOrder.indexOf(sizeB);
  });
  
  // Apply orientation constraints
  return sorted.map((piece, index) => {
    let allowedRotations: number[];
    
    switch (orientation) {
      case 'horizontal':
        allowedRotations = [0, 180];
        break;
      case 'vertical':
        allowedRotations = [90, 270];
        break;
      case 'alternating':
        allowedRotations = index % 2 === 0 ? [0, 180] : [90, 270];
        break;
      case 'mixed':
      default:
        allowedRotations = [0, 90, 180, 270];
    }
    
    return { ...piece, allowedRotations };
  });
}

function extractSize(name: string): string {
  const match = name.match(/\((XS|S|M|L|XL|2XL|3XL|4XL|5XL)\)/i);
  return match ? match[1].toUpperCase() : 'M';
}

// ============================================================================
// PIECE ORIENTATION CONSTRAINTS
// ============================================================================

export interface PieceConstraints {
  pieceId: string;
  allowedRotations: number[];
  allowFlip: boolean;
  grainTolerance: number;
  minGap: number;
  maxGap: number;
}

/**
 * Apply individual piece constraints
 */
export function applyPieceConstraints(
  pieces: PatternPiece[],
  constraints: PieceConstraints[]
): PatternPiece[] {
  const constraintMap = new Map(constraints.map(c => [c.pieceId, c]));
  
  return pieces.map(piece => {
    const constraint = constraintMap.get(piece.id);
    if (!constraint) return piece;
    
    return {
      ...piece,
      allowedRotations: constraint.allowedRotations
    };
  });
}

// ============================================================================
// GAP CONFIGURATION
// ============================================================================

export interface GapConfig {
  defaultGap: number;
  pieceGaps: Map<string, number>;
  sizeGaps: Map<string, number>;
}

/**
 * Calculate effective gap between two pieces
 */
export function calculateGap(
  piece1: PatternPiece,
  piece2: PatternPiece,
  config: GapConfig
): number {
  // Check piece-specific gaps
  const pieceGap1 = config.pieceGaps.get(piece1.id);
  const pieceGap2 = config.pieceGaps.get(piece2.id);
  
  if (pieceGap1 !== undefined && pieceGap2 !== undefined) {
    return Math.max(pieceGap1, pieceGap2);
  }
  
  // Check size-specific gaps
  const size1 = extractSize(piece1.name);
  const size2 = extractSize(piece2.name);
  const sizeGap1 = config.sizeGaps.get(size1);
  const sizeGap2 = config.sizeGaps.get(size2);
  
  if (sizeGap1 !== undefined && sizeGap2 !== undefined) {
    return Math.max(sizeGap1, sizeGap2);
  }
  
  return config.defaultGap;
}

// ============================================================================
// SHRINKAGE COMPENSATION
// ============================================================================

export interface ShrinkageConfig {
  percentageX: number;
  percentageY: number;
  applyToAll: boolean;
  excludePieces: string[];
}

/**
 * Apply shrinkage compensation to pieces
 */
export function applyShrinkageCompensation(
  pieces: PatternPiece[],
  config: ShrinkageConfig
): PatternPiece[] {
  const scaleX = 1 + config.percentageX / 100;
  const scaleY = 1 + config.percentageY / 100;
  
  return pieces.map(piece => {
    if (!config.applyToAll && config.excludePieces.includes(piece.id)) {
      return piece;
    }
    
    const center = getCentroid(piece.vertices);
    const scaled = piece.vertices.map(v => ({
      x: center.x + (v.x - center.x) * scaleX,
      y: center.y + (v.y - center.y) * scaleY
    }));
    
    return { ...piece, vertices: scaled };
  });
}

function getCentroid(vertices: Point[]): Point {
  const sx = vertices.reduce((s, v) => s + v.x, 0);
  const sy = vertices.reduce((s, v) => s + v.y, 0);
  return { x: sx / vertices.length, y: sy / vertices.length };
}

// ============================================================================
// BLOCK/GROUP MAKING
// ============================================================================

export interface PieceBlock {
  id: string;
  name: string;
  pieces: PatternPiece[];
  arrangement: 'horizontal' | 'vertical' | 'grid';
  gap: number;
  locked: boolean;
}

/**
 * Create a block from multiple pieces
 */
export function createBlock(
  pieces: PatternPiece[],
  name: string,
  arrangement: PieceBlock['arrangement'] = 'horizontal',
  gap: number = 1
): PieceBlock {
  return {
    id: generateId(),
    name,
    pieces,
    arrangement,
    gap,
    locked: false
  };
}

/**
 * Arrange pieces within a block
 */
export function arrangeBlock(block: PieceBlock): Point[][] {
  const { pieces, arrangement, gap } = block;
  const positions: Point[][] = [];
  
  let currentX = 0;
  let currentY = 0;
  let maxHeight = 0;
  let maxWidth = 0;
  
  for (const piece of pieces) {
    const bbox = getBoundingBox(piece.vertices);
    const normalized = piece.vertices.map(v => ({
      x: v.x - bbox.minX + currentX,
      y: v.y - bbox.minY + currentY
    }));
    
    positions.push(normalized);
    
    switch (arrangement) {
      case 'horizontal':
        currentX += bbox.width + gap;
        maxHeight = Math.max(maxHeight, bbox.height);
        break;
      case 'vertical':
        currentY += bbox.height + gap;
        maxWidth = Math.max(maxWidth, bbox.width);
        break;
      case 'grid':
        currentX += bbox.width + gap;
        maxHeight = Math.max(maxHeight, bbox.height);
        if (currentX > 100) { // Grid width threshold
          currentX = 0;
          currentY += maxHeight + gap;
          maxHeight = 0;
        }
        break;
    }
  }
  
  return positions;
}

/**
 * Create a rectangular block with defined gaps
 */
export function createRectangleBlock(
  pieces: PatternPiece[],
  columns: number,
  rowGap: number,
  colGap: number
): PieceBlock {
  const arranged: PatternPiece[] = [];
  let currentX = 0;
  let currentY = 0;
  let maxRowHeight = 0;
  
  pieces.forEach((piece, index) => {
    const bbox = getBoundingBox(piece.vertices);
    const translated = piece.vertices.map(v => ({
      x: v.x - bbox.minX + currentX,
      y: v.y - bbox.minY + currentY
    }));
    
    arranged.push({ ...piece, vertices: translated });
    
    maxRowHeight = Math.max(maxRowHeight, bbox.height);
    
    if ((index + 1) % columns === 0) {
      currentX = 0;
      currentY += maxRowHeight + rowGap;
      maxRowHeight = 0;
    } else {
      currentX += bbox.width + colGap;
    }
  });
  
  return {
    id: generateId(),
    name: 'Rectangle Block',
    pieces: arranged,
    arrangement: 'grid',
    gap: Math.max(rowGap, colGap),
    locked: true
  };
}

// ============================================================================
// FIXED PIECES (LOCK POSITION)
// ============================================================================

export interface FixedPiece {
  pieceId: string;
  position: Point;
  rotation: number;
  locked: boolean;
}

/**
 * Lock pieces at specific positions on marker
 */
export function lockPieces(
  placements: PiecePlacement[],
  pieceIds: string[]
): PiecePlacement[] {
  return placements.map(p => ({
    ...p,
    isFixed: pieceIds.includes(p.pieceId) ? true : p.isFixed
  }));
}

/**
 * Unlock pieces
 */
export function unlockPieces(
  placements: PiecePlacement[],
  pieceIds: string[]
): PiecePlacement[] {
  return placements.map(p => ({
    ...p,
    isFixed: pieceIds.includes(p.pieceId) ? false : p.isFixed
  }));
}

// ============================================================================
// PIECE PRIORITY
// ============================================================================

/**
 * Set nesting priority for pieces
 */
export function setPiecePriority(
  pieces: PatternPiece[],
  priorities: Map<string, number>
): PatternPiece[] {
  return pieces.map(piece => ({
    ...piece,
    priority: priorities.get(piece.id) ?? piece.priority
  }));
}

/**
 * Sort pieces by priority for nesting
 */
export function sortByPriority(pieces: PatternPiece[]): PatternPiece[] {
  return [...pieces].sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// ADVANCED NESTING WITH ALL FEATURES
// ============================================================================

export interface AdvancedNestingConfig extends NestingConfig {
  sizeOrientation?: SizeOrientationConfig;
  pieceConstraints?: PieceConstraints[];
  gapConfig?: GapConfig;
  shrinkageConfig?: ShrinkageConfig;
  blocks?: PieceBlock[];
  fixedPieces?: FixedPiece[];
}

/**
 * Advanced auto-nesting with all features
 */
export function advancedAutoNest(
  pieces: PatternPiece[],
  config: AdvancedNestingConfig
): { placements: PiecePlacement[]; efficiency: number; markerLength: number } {
  let processedPieces = [...pieces];
  
  // Apply size orientation
  if (config.sizeOrientation) {
    processedPieces = applySizeOrientation(processedPieces, config.sizeOrientation);
  }
  
  // Apply piece constraints
  if (config.pieceConstraints) {
    processedPieces = applyPieceConstraints(processedPieces, config.pieceConstraints);
  }
  
  // Apply shrinkage compensation
  if (config.shrinkageConfig) {
    processedPieces = applyShrinkageCompensation(processedPieces, config.shrinkageConfig);
  }
  
  // Sort by priority
  processedPieces = sortByPriority(processedPieces);
  
  // Run nesting
  const result = autoNest(processedPieces, config);
  
  // Apply fixed pieces
  if (config.fixedPieces && config.fixedPieces.length > 0) {
    const fixedIds = new Set(config.fixedPieces.map(f => f.pieceId));
    result.placements = result.placements.map(p => {
      const fixed = config.fixedPieces!.find(f => f.pieceId === p.pieceId);
      if (fixed) {
        return { ...p, position: fixed.position, rotation: fixed.rotation, isFixed: true };
      }
      return p;
    });
  }
  
  return {
    placements: result.placements,
    efficiency: result.efficiency,
    markerLength: result.markerLength
  };
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export { extractSize };
