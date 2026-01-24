/**
 * ProCAD by AlgaMax - Type Definitions
 * Complete type system for pattern making, grading, nesting, and production
 */

// ============================================================================
// BASIC GEOMETRY TYPES
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Line {
  start: Point;
  end: Point;
}

export interface BezierCurve {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
}

// ============================================================================
// UNIT SYSTEM
// ============================================================================

export type UnitSystem = 'metric' | 'imperial';

export interface UnitConfig {
  system: UnitSystem;
  precision: number;
  displayUnit: string;
}

// ============================================================================
// PATTERN PIECE TYPES
// ============================================================================

export interface PatternVertex extends Point {
  id: string;
  type: 'corner' | 'curve' | 'notch' | 'gradePoint';
  controlPoint1?: Point;
  controlPoint2?: Point;
  isSelected?: boolean;
}

export interface Notch {
  id: string;
  position: Point;
  type: 'slit' | 'v-notch' | 't-notch' | 'circle';
  angle: number;
  depth: number;
}

export interface GrainLine {
  start: Point;
  end: Point;
  angle: number;
}

export interface SeamAllowance {
  width: number;
  vertices: Point[];
}

export interface GradePoint {
  id: string;
  position: Point;
  rules: GradeRule[];
}

export interface GradeRule {
  size: string;
  deltaX: number;
  deltaY: number;
}

export interface PatternPiece {
  id: string;
  name: string;
  vertices: Point[];
  patternVertices?: PatternVertex[];
  notches: Notch[];
  grainLine?: GrainLine;
  seamAllowance?: SeamAllowance;
  gradePoints: GradePoint[];
  quantity: number;
  rotation: number;
  mirrored: boolean;
  isLocked: boolean;
  priority: number;
  allowedRotations: number[];
  color?: string;
  layer?: string;
}

// ============================================================================
// GRADING SYSTEM
// ============================================================================

export interface SizeDefinition {
  name: string;
  label: string;
  baseSize: boolean;
  measurements: Record<string, number>;
}

export interface GradingRuleSet {
  id: string;
  name: string;
  sizes: SizeDefinition[];
  rules: GradeRule[];
}

// ============================================================================
// DART AND PLEAT TYPES
// ============================================================================

export interface Dart {
  id: string;
  apex: Point;
  leg1: Point;
  leg2: Point;
  width: number;
  depth: number;
  type: 'single' | 'double' | 'french';
}

export interface Pleat {
  id: string;
  type: 'knife' | 'box' | 'inverted' | 'accordion';
  position: Point;
  width: number;
  depth: number;
  direction: 'left' | 'right' | 'center';
  count: number;
  spacing: number;
}

// ============================================================================
// NESTING CONFIGURATION
// ============================================================================

export interface NestingConfig {
  fabricWidth: number;
  fabricLength?: number;
  spacing: number;
  pieceGap?: number;
  rotationAngles: number[];
  allowMirror: boolean;
  grainDirection: boolean;
  shrinkageX: number;
  shrinkageY: number;
}

export interface PiecePlacement {
  pieceId: string;
  position: Point;
  rotation: number;
  mirrored: boolean;
  isFixed: boolean;
  shrinkageApplied: boolean;
}

export interface NestingResult {
  placements: PiecePlacement[];
  efficiency: number;
  fabricUsed: number;
  wasteArea: number;
  totalArea: number;
  markerLength: number;
  computeTime: number;
}

// ============================================================================
// FABRIC DEFECTS AND PLAID
// ============================================================================

export interface FabricDefect {
  id: string;
  type: 'rectangle' | 'circle' | 'polygon';
  position: Point;
  width?: number;
  height?: number;
  radius?: number;
  vertices?: Point[];
  severity: 'minor' | 'major' | 'critical';
}

export interface PlaidPattern {
  horizontalRepeat: number;
  verticalRepeat: number;
  horizontalOffset: number;
  verticalOffset: number;
  matchingRequired: boolean;
}

// ============================================================================
// MARKER MAKING
// ============================================================================

export interface MarkerConfig {
  id: string;
  name: string;
  styleName: string;
  description: string;
  fabricWidth: number;
  fabricType: string;
  sizes: MarkerSizeConfig[];
  nestingConfig: NestingConfig;
}

export interface MarkerSizeConfig {
  size: string;
  quantity: number;
  ratio: number;
}

export interface MarkerReport {
  markerId: string;
  styleName: string;
  description: string;
  fabricWidth: number;
  markerLength: number;
  efficiency: number;
  wastePercentage: number;
  totalPieces: number;
  piecesBySize: Record<string, number>;
  consumptionPerPiece: number;
  consumptionPerBundle: number;
  totalFabricUsed: number;
  generatedAt: Date;
}

// ============================================================================
// PATTERN CAPTURE
// ============================================================================

export interface CameraCalibration {
  tableWidth: number;
  tableLength: number;
  pixelsPerCm: number;
  perspectiveMatrix: number[][];
  referenceMarkers: Point[];
}

export interface CapturedPattern {
  id: string;
  imageData: string;
  contour: Point[];
  extractedPiece: PatternPiece;
  capturedAt: Date;
  confidence: number;
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export interface FabricCost {
  pricePerMeter: number;
  currency: string;
  wasteFactor: number;
}

export interface LaborCost {
  cuttingRatePerHour: number;
  setupTimeMinutes: number;
  piecesPerHour: number;
}

export interface CostConfig {
  fabricCost: FabricCost;
  laborCost: LaborCost;
  overheadPercentage: number;
}

export interface CostReport {
  fabricCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerPiece: number;
  costPerBundle: number;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  category: string;
  description: string;
  amount: number;
  percentage: number;
}

// ============================================================================
// TECH PACK
// ============================================================================

export interface TechPack {
  styleName: string;
  styleNumber: string;
  patterns: PatternPieceSpec[];
  gradingSpecs: GradingSpec[];
  markerData?: MarkerReport;
  costData?: CostReport;
  generatedAt: Date;
}

export interface PatternPieceSpec {
  pieceId: string;
  name: string;
  area: number;
  perimeter: number;
  notchCount: number;
  gradePointCount: number;
  seamAllowanceWidth: number;
  grainAngle: number;
}

export interface GradingSpec {
  pieceId: string;
  pieceName: string;
  sizeRange: string[];
  growthX: number;
  growthY: number;
  gradePointCount: number;
}

// ============================================================================
// LICENSE SYSTEM
// ============================================================================

export interface LicenseInfo {
  key: string;
  type: 'trial' | 'standard' | 'professional' | 'enterprise';
  features: string[];
  expiresAt: Date;
  machineId: string;
  isValid: boolean;
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export type ExportFormat = 'dxf' | 'svg' | 'pdf' | 'hpgl' | 'plt' | 'procad';

export interface ExportConfig {
  format: ExportFormat;
  scale: number;
  includeSeamAllowance: boolean;
  includeNotches: boolean;
  includeGrainLine: boolean;
  includeGrading: boolean;
  selectedSizes: string[];
}

// ============================================================================
// APPLICATION STATE
// ============================================================================

export type ToolType = 
  | 'select' | 'pan' | 'zoom' | 'line' | 'curve' | 'rectangle'
  | 'polygon' | 'freehand' | 'edit' | 'reshape' | 'resize'
  | 'cut' | 'join' | 'split' | 'measure' | 'angle'
  | 'seamAllowance' | 'notch' | 'grainLine' | 'gradePoint'
  | 'dart' | 'pleat' | 'capture';
