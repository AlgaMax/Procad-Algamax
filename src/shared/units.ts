/**
 * ProCAD by AlgaMax - Unit System
 * Handles metric/imperial conversion and formatting
 */

import { UnitSystem, UnitConfig, Point } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const CM_PER_INCH = 2.54;
const INCH_PER_CM = 1 / CM_PER_INCH;

// Default configurations
export const METRIC_CONFIG: UnitConfig = {
  system: 'metric',
  precision: 2,
  displayUnit: 'cm'
};

export const IMPERIAL_CONFIG: UnitConfig = {
  system: 'imperial',
  precision: 3,
  displayUnit: 'in'
};

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return cm * INCH_PER_CM;
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/**
 * Convert value from one unit system to another
 */
export function convertUnits(
  value: number,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): number {
  if (fromSystem === toSystem) return value;
  
  if (fromSystem === 'metric' && toSystem === 'imperial') {
    return cmToInches(value);
  } else {
    return inchesToCm(value);
  }
}

/**
 * Convert a point from one unit system to another
 */
export function convertPoint(
  point: Point,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): Point {
  return {
    x: convertUnits(point.x, fromSystem, toSystem),
    y: convertUnits(point.y, fromSystem, toSystem)
  };
}

/**
 * Convert an array of points from one unit system to another
 */
export function convertPoints(
  points: Point[],
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): Point[] {
  return points.map(p => convertPoint(p, fromSystem, toSystem));
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format a value with the appropriate precision and unit
 */
export function formatValue(value: number, config: UnitConfig): string {
  const formatted = value.toFixed(config.precision);
  return `${formatted} ${config.displayUnit}`;
}

/**
 * Format a distance measurement
 */
export function formatDistance(cm: number, config: UnitConfig): string {
  const value = config.system === 'imperial' ? cmToInches(cm) : cm;
  return formatValue(value, config);
}

/**
 * Format an area measurement
 */
export function formatArea(sqCm: number, config: UnitConfig): string {
  if (config.system === 'imperial') {
    const sqInches = sqCm * (INCH_PER_CM * INCH_PER_CM);
    return `${sqInches.toFixed(config.precision)} sq in`;
  }
  return `${sqCm.toFixed(config.precision)} sq cm`;
}

/**
 * Format an angle in degrees
 */
export function formatAngle(degrees: number, precision: number = 1): string {
  return `${degrees.toFixed(precision)}°`;
}

/**
 * Format coordinates as a string
 */
export function formatCoordinates(point: Point, config: UnitConfig): string {
  const x = config.system === 'imperial' ? cmToInches(point.x) : point.x;
  const y = config.system === 'imperial' ? cmToInches(point.y) : point.y;
  return `(${x.toFixed(config.precision)}, ${y.toFixed(config.precision)}) ${config.displayUnit}`;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse a value string with unit and convert to cm
 */
export function parseValue(valueStr: string): { value: number; unit: UnitSystem } {
  const trimmed = valueStr.trim().toLowerCase();
  
  // Check for inch indicators
  if (trimmed.includes('in') || trimmed.includes('"') || trimmed.includes('inch')) {
    const numStr = trimmed.replace(/[^0-9.-]/g, '');
    const value = parseFloat(numStr);
    return { value: inchesToCm(value), unit: 'imperial' };
  }
  
  // Default to metric (cm)
  const numStr = trimmed.replace(/[^0-9.-]/g, '');
  const value = parseFloat(numStr);
  return { value, unit: 'metric' };
}

/**
 * Parse a coordinate string
 */
export function parseCoordinates(coordStr: string, config: UnitConfig): Point | null {
  const match = coordStr.match(/\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/);
  if (!match) return null;
  
  let x = parseFloat(match[1]);
  let y = parseFloat(match[2]);
  
  // Convert to cm if imperial
  if (config.system === 'imperial') {
    x = inchesToCm(x);
    y = inchesToCm(y);
  }
  
  return { x, y };
}

// ============================================================================
// MEASUREMENT CALCULATIONS
// ============================================================================

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points (in degrees)
 */
export function calculateAngle(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Calculate angle between three points (vertex at p2)
 */
export function calculateAngleBetween(p1: Point, p2: Point, p3: Point): number {
  const angle1 = calculateAngle(p2, p1);
  const angle2 = calculateAngle(p2, p3);
  let angle = Math.abs(angle2 - angle1);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/**
 * Calculate polygon area using shoelace formula
 */
export function calculatePolygonArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Calculate polygon perimeter
 */
export function calculatePolygonPerimeter(vertices: Point[]): number {
  let perimeter = 0;
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += calculateDistance(vertices[i], vertices[j]);
  }
  
  return perimeter;
}

// ============================================================================
// UNIT SYSTEM CLASS
// ============================================================================

export class UnitSystemManager {
  private config: UnitConfig;
  
  constructor(system: UnitSystem = 'metric') {
    this.config = system === 'metric' ? { ...METRIC_CONFIG } : { ...IMPERIAL_CONFIG };
  }
  
  getConfig(): UnitConfig {
    return { ...this.config };
  }
  
  setSystem(system: UnitSystem): void {
    this.config = system === 'metric' ? { ...METRIC_CONFIG } : { ...IMPERIAL_CONFIG };
  }
  
  setPrecision(precision: number): void {
    this.config.precision = precision;
  }
  
  format(valueCm: number): string {
    return formatDistance(valueCm, this.config);
  }
  
  formatArea(sqCm: number): string {
    return formatArea(sqCm, this.config);
  }
  
  formatCoords(point: Point): string {
    return formatCoordinates(point, this.config);
  }
  
  parse(valueStr: string): number {
    const { value } = parseValue(valueStr);
    return value;
  }
  
  toDisplay(valueCm: number): number {
    return this.config.system === 'imperial' ? cmToInches(valueCm) : valueCm;
  }
  
  fromDisplay(displayValue: number): number {
    return this.config.system === 'imperial' ? inchesToCm(displayValue) : displayValue;
  }
}

// Default instance
export const unitSystem = new UnitSystemManager();

export default unitSystem;
