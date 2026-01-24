/**
 * ProCAD by AlgaMax - Grading System
 * Size grading rules and pattern scaling for multiple sizes
 */

import { Point, PatternPiece, GradePoint, GradeRule, SizeDefinition, GradingRuleSet } from './types';
import { getCentroid, scalePoint } from './patternOps';

// ============================================================================
// STANDARD SIZE DEFINITIONS
// ============================================================================

export const STANDARD_SIZES: SizeDefinition[] = [
  { name: 'XS', label: 'Extra Small', baseSize: false, measurements: { bust: 81, waist: 61, hip: 86 } },
  { name: 'S', label: 'Small', baseSize: false, measurements: { bust: 86, waist: 66, hip: 91 } },
  { name: 'M', label: 'Medium', baseSize: true, measurements: { bust: 91, waist: 71, hip: 96 } },
  { name: 'L', label: 'Large', baseSize: false, measurements: { bust: 96, waist: 76, hip: 101 } },
  { name: 'XL', label: 'Extra Large', baseSize: false, measurements: { bust: 101, waist: 81, hip: 106 } },
  { name: '2XL', label: '2X Large', baseSize: false, measurements: { bust: 106, waist: 86, hip: 111 } },
  { name: '3XL', label: '3X Large', baseSize: false, measurements: { bust: 111, waist: 91, hip: 116 } },
  { name: '4XL', label: '4X Large', baseSize: false, measurements: { bust: 116, waist: 96, hip: 121 } },
  { name: '5XL', label: '5X Large', baseSize: false, measurements: { bust: 121, waist: 101, hip: 126 } }
];

// Standard grade increments (cm per size jump)
export const STANDARD_GRADE_INCREMENT = {
  bust: 5,
  waist: 5,
  hip: 5,
  shoulder: 1,
  armhole: 1.5,
  sleeve: 2,
  length: 1.5
};

// ============================================================================
// GRADE POINT MANAGEMENT
// ============================================================================

/**
 * Add a grade point to a pattern
 */
export function addGradePoint(
  pattern: PatternPiece,
  position: Point,
  rules?: GradeRule[]
): PatternPiece {
  const gradePoint: GradePoint = {
    id: generateId(),
    position,
    rules: rules || generateDefaultRules()
  };
  
  return {
    ...pattern,
    gradePoints: [...pattern.gradePoints, gradePoint]
  };
}

/**
 * Remove a grade point from pattern
 */
export function removeGradePoint(pattern: PatternPiece, gradePointId: string): PatternPiece {
  return {
    ...pattern,
    gradePoints: pattern.gradePoints.filter(gp => gp.id !== gradePointId)
  };
}

/**
 * Update grade point rules
 */
export function updateGradePointRules(
  pattern: PatternPiece,
  gradePointId: string,
  rules: GradeRule[]
): PatternPiece {
  return {
    ...pattern,
    gradePoints: pattern.gradePoints.map(gp =>
      gp.id === gradePointId ? { ...gp, rules } : gp
    )
  };
}

/**
 * Generate default grade rules for all standard sizes
 */
export function generateDefaultRules(): GradeRule[] {
  const baseIndex = STANDARD_SIZES.findIndex(s => s.baseSize);
  
  return STANDARD_SIZES.map((size, index) => {
    const sizeJump = index - baseIndex;
    return {
      size: size.name,
      deltaX: sizeJump * 0.5, // Default 0.5cm per size
      deltaY: sizeJump * 0.3  // Default 0.3cm per size
    };
  });
}

/**
 * Auto-place grade points at pattern vertices
 */
export function autoPlaceGradePoints(pattern: PatternPiece): PatternPiece {
  const gradePoints: GradePoint[] = pattern.vertices.map((vertex, index) => ({
    id: generateId(),
    position: { ...vertex },
    rules: generateDefaultRules()
  }));
  
  return {
    ...pattern,
    gradePoints
  };
}

// ============================================================================
// GRADING APPLICATION
// ============================================================================

/**
 * Apply grading to get pattern for a specific size
 */
export function applyGrading(pattern: PatternPiece, targetSize: string): PatternPiece {
  // If no grade points, use simple scaling
  if (pattern.gradePoints.length === 0) {
    return applySimpleGrading(pattern, targetSize);
  }
  
  // Apply grade point rules
  const gradedVertices = pattern.vertices.map((vertex, index) => {
    const gradePoint = pattern.gradePoints[index];
    if (!gradePoint) return vertex;
    
    const rule = gradePoint.rules.find(r => r.size === targetSize);
    if (!rule) return vertex;
    
    return {
      x: vertex.x + rule.deltaX,
      y: vertex.y + rule.deltaY
    };
  });
  
  // Grade notches
  const gradedNotches = pattern.notches.map(notch => {
    const nearestGP = findNearestGradePoint(notch.position, pattern.gradePoints);
    if (!nearestGP) return notch;
    
    const rule = nearestGP.rules.find(r => r.size === targetSize);
    if (!rule) return notch;
    
    return {
      ...notch,
      position: {
        x: notch.position.x + rule.deltaX,
        y: notch.position.y + rule.deltaY
      }
    };
  });
  
  // Grade grain line
  const gradedGrainLine = pattern.grainLine ? {
    ...pattern.grainLine,
    start: applyNearestGradeRule(pattern.grainLine.start, pattern.gradePoints, targetSize),
    end: applyNearestGradeRule(pattern.grainLine.end, pattern.gradePoints, targetSize)
  } : undefined;
  
  return {
    ...pattern,
    id: `${pattern.id}_${targetSize}`,
    name: `${pattern.name} (${targetSize})`,
    vertices: gradedVertices,
    notches: gradedNotches,
    grainLine: gradedGrainLine
  };
}

/**
 * Apply simple scaling-based grading
 */
export function applySimpleGrading(pattern: PatternPiece, targetSize: string): PatternPiece {
  const baseIndex = STANDARD_SIZES.findIndex(s => s.baseSize);
  const targetIndex = STANDARD_SIZES.findIndex(s => s.name === targetSize);
  
  if (targetIndex === -1) return pattern;
  
  const sizeJump = targetIndex - baseIndex;
  const scaleX = 1 + (sizeJump * 0.02); // 2% per size
  const scaleY = 1 + (sizeJump * 0.015); // 1.5% per size
  
  const center = getCentroid(pattern.vertices);
  const scaledVertices = pattern.vertices.map(v => scalePoint(v, center, scaleX, scaleY));
  
  return {
    ...pattern,
    id: `${pattern.id}_${targetSize}`,
    name: `${pattern.name} (${targetSize})`,
    vertices: scaledVertices
  };
}

/**
 * Generate all graded sizes for a pattern
 */
export function generateAllGradedSizes(
  pattern: PatternPiece,
  sizes: string[] = STANDARD_SIZES.map(s => s.name)
): Map<string, PatternPiece> {
  const gradedPatterns = new Map<string, PatternPiece>();
  
  for (const size of sizes) {
    gradedPatterns.set(size, applyGrading(pattern, size));
  }
  
  return gradedPatterns;
}

// ============================================================================
// GRADING RULE SETS
// ============================================================================

/**
 * Create a new grading rule set
 */
export function createGradingRuleSet(
  name: string,
  sizes: SizeDefinition[] = STANDARD_SIZES
): GradingRuleSet {
  return {
    id: generateId(),
    name,
    sizes,
    rules: generateDefaultRules()
  };
}

/**
 * Copy grading rules from one pattern to another
 */
export function copyGradingRules(
  sourcePattern: PatternPiece,
  targetPattern: PatternPiece
): PatternPiece {
  // Map source grade points to target vertices by relative position
  const sourceBounds = getBounds(sourcePattern.vertices);
  const targetBounds = getBounds(targetPattern.vertices);
  
  const copiedGradePoints: GradePoint[] = sourcePattern.gradePoints.map(gp => {
    // Calculate relative position in source
    const relX = (gp.position.x - sourceBounds.minX) / sourceBounds.width;
    const relY = (gp.position.y - sourceBounds.minY) / sourceBounds.height;
    
    // Map to target
    const newPos: Point = {
      x: targetBounds.minX + relX * targetBounds.width,
      y: targetBounds.minY + relY * targetBounds.height
    };
    
    return {
      ...gp,
      id: generateId(),
      position: newPos
    };
  });
  
  return {
    ...targetPattern,
    gradePoints: copiedGradePoints
  };
}

// ============================================================================
// STACK TOOL - Compare graded sizes
// ============================================================================

/**
 * Generate stacked view of all sizes for comparison
 */
export function generateStackedView(
  pattern: PatternPiece,
  sizes: string[]
): { size: string; vertices: Point[]; color: string }[] {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];
  
  return sizes.map((size, index) => {
    const graded = applyGrading(pattern, size);
    return {
      size,
      vertices: graded.vertices,
      color: colors[index % colors.length]
    };
  });
}

/**
 * Calculate growth between sizes
 */
export function calculateGrowth(
  pattern: PatternPiece,
  fromSize: string,
  toSize: string
): { growthX: number; growthY: number; growthArea: number } {
  const fromPattern = applyGrading(pattern, fromSize);
  const toPattern = applyGrading(pattern, toSize);
  
  const fromBounds = getBounds(fromPattern.vertices);
  const toBounds = getBounds(toPattern.vertices);
  
  const fromArea = calculateArea(fromPattern.vertices);
  const toArea = calculateArea(toPattern.vertices);
  
  return {
    growthX: toBounds.width - fromBounds.width,
    growthY: toBounds.height - fromBounds.height,
    growthArea: toArea - fromArea
  };
}

// ============================================================================
// RESHAPE TOOL - Modify single size
// ============================================================================

/**
 * Reshape a specific size while maintaining grading relationships
 */
export function reshapeSingleSize(
  pattern: PatternPiece,
  targetSize: string,
  vertexIndex: number,
  newPosition: Point
): PatternPiece {
  // Find the grade point for this vertex
  const gradePoint = pattern.gradePoints[vertexIndex];
  if (!gradePoint) return pattern;
  
  // Calculate the delta from base position
  const baseVertex = pattern.vertices[vertexIndex];
  const deltaX = newPosition.x - baseVertex.x;
  const deltaY = newPosition.y - baseVertex.y;
  
  // Update only the rule for the target size
  const updatedRules = gradePoint.rules.map(rule => {
    if (rule.size === targetSize) {
      return { ...rule, deltaX, deltaY };
    }
    return rule;
  });
  
  return updateGradePointRules(pattern, gradePoint.id, updatedRules);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function findNearestGradePoint(position: Point, gradePoints: GradePoint[]): GradePoint | null {
  if (gradePoints.length === 0) return null;
  
  let nearest = gradePoints[0];
  let minDist = distance(position, nearest.position);
  
  for (const gp of gradePoints) {
    const dist = distance(position, gp.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = gp;
    }
  }
  
  return nearest;
}

function applyNearestGradeRule(position: Point, gradePoints: GradePoint[], targetSize: string): Point {
  const nearestGP = findNearestGradePoint(position, gradePoints);
  if (!nearestGP) return position;
  
  const rule = nearestGP.rules.find(r => r.size === targetSize);
  if (!rule) return position;
  
  return {
    x: position.x + rule.deltaX,
    y: position.y + rule.deltaY
  };
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function getBounds(vertices: Point[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function calculateArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export {
  STANDARD_SIZES,
  STANDARD_GRADE_INCREMENT
};
