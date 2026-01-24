/**
 * ProCAD by AlgaMax - Cost Calculation Module
 */

import { NestingResult } from './types';

export interface FabricCostConfig { pricePerMeter: number; fabricWidth: number; currency: string; wastageAllowance: number; }
export interface LaborCostConfig { hourlyRate: number; setupTimeMinutes: number; piecesPerHour: number; overheadMultiplier: number; }
export interface CostBreakdown { fabricCost: number; laborCost: number; overheadCost: number; totalCost: number; costPerPiece: number; costPerBundle: number; currency: string; }
export interface CostReport { styleName: string; orderQuantity: number; breakdown: CostBreakdown; fabricDetails: { metersUsed: number; metersWasted: number; efficiency: number }; laborDetails: { totalHours: number; setupHours: number; cuttingHours: number }; generatedAt: Date; }

export const DEFAULT_FABRIC_COST: FabricCostConfig = { pricePerMeter: 5.00, fabricWidth: 150, currency: 'USD', wastageAllowance: 0.05 };
export const DEFAULT_LABOR_COST: LaborCostConfig = { hourlyRate: 15.00, setupTimeMinutes: 30, piecesPerHour: 100, overheadMultiplier: 1.3 };

export function calculateFabricCost(markerLength: number, config: FabricCostConfig): { cost: number; metersUsed: number } {
  const metersUsed = (markerLength / 100) * (1 + config.wastageAllowance);
  return { cost: metersUsed * config.pricePerMeter, metersUsed };
}

export function calculateLaborCost(totalPieces: number, config: LaborCostConfig): { cost: number; totalHours: number; setupHours: number; cuttingHours: number } {
  const setupHours = config.setupTimeMinutes / 60;
  const cuttingHours = totalPieces / config.piecesPerHour;
  const totalHours = setupHours + cuttingHours;
  const cost = totalHours * config.hourlyRate * config.overheadMultiplier;
  return { cost, totalHours, setupHours, cuttingHours };
}

export function calculateTotalCost(nestingResult: NestingResult, totalPieces: number, fabricConfig = DEFAULT_FABRIC_COST, laborConfig = DEFAULT_LABOR_COST): CostBreakdown {
  const fabric = calculateFabricCost(nestingResult.markerLength, fabricConfig);
  const labor = calculateLaborCost(totalPieces, laborConfig);
  const overheadCost = labor.cost - (labor.totalHours * laborConfig.hourlyRate);
  const totalCost = fabric.cost + labor.cost;
  return { fabricCost: fabric.cost, laborCost: labor.cost - overheadCost, overheadCost, totalCost, costPerPiece: totalCost / totalPieces, costPerBundle: (totalCost / totalPieces) * 12, currency: fabricConfig.currency };
}

export function generateCostReport(styleName: string, orderQuantity: number, nestingResult: NestingResult, totalPieces: number, fabricConfig = DEFAULT_FABRIC_COST, laborConfig = DEFAULT_LABOR_COST): CostReport {
  const breakdown = calculateTotalCost(nestingResult, totalPieces, fabricConfig, laborConfig);
  const fabric = calculateFabricCost(nestingResult.markerLength, fabricConfig);
  const labor = calculateLaborCost(totalPieces, laborConfig);
  return { styleName, orderQuantity, breakdown, fabricDetails: { metersUsed: fabric.metersUsed, metersWasted: fabric.metersUsed * (1 - nestingResult.efficiency / 100), efficiency: nestingResult.efficiency }, laborDetails: labor, generatedAt: new Date() };
}

export function formatCostReportText(r: CostReport): string {
  const { breakdown: b, fabricDetails: f, laborDetails: l } = r;
  return `COST ANALYSIS REPORT\n${'='.repeat(60)}\nStyle: ${r.styleName} | Qty: ${r.orderQuantity} | Date: ${r.generatedAt.toLocaleString()}\n\nFABRIC: ${f.metersUsed.toFixed(2)}m used, ${f.metersWasted.toFixed(2)}m waste, ${f.efficiency.toFixed(1)}% eff\nCost: ${b.currency} ${b.fabricCost.toFixed(2)}\n\nLABOR: ${l.totalHours.toFixed(2)}hrs (${l.setupHours.toFixed(2)} setup + ${l.cuttingHours.toFixed(2)} cutting)\nCost: ${b.currency} ${b.laborCost.toFixed(2)} + ${b.currency} ${b.overheadCost.toFixed(2)} overhead\n\nTOTAL: ${b.currency} ${b.totalCost.toFixed(2)} | Per Piece: ${b.currency} ${b.costPerPiece.toFixed(2)}`;
}

export function formatCostReportHTML(r: CostReport): string {
  const { breakdown: b, fabricDetails: f, laborDetails: l } = r;
  return `<!DOCTYPE html><html><head><title>Cost Report</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#007bff;color:white}.total{font-size:20px;color:#28a745}</style></head><body><h1>Cost Report: ${r.styleName}</h1><p>Qty: ${r.orderQuantity} | ${r.generatedAt.toLocaleString()}</p><h2>Fabric</h2><table><tr><td>Used</td><td>${f.metersUsed.toFixed(2)}m</td></tr><tr><td>Waste</td><td>${f.metersWasted.toFixed(2)}m</td></tr><tr><td>Efficiency</td><td>${f.efficiency.toFixed(1)}%</td></tr><tr><td>Cost</td><td>${b.currency} ${b.fabricCost.toFixed(2)}</td></tr></table><h2>Labor</h2><table><tr><td>Hours</td><td>${l.totalHours.toFixed(2)}</td></tr><tr><td>Cost</td><td>${b.currency} ${b.laborCost.toFixed(2)}</td></tr><tr><td>Overhead</td><td>${b.currency} ${b.overheadCost.toFixed(2)}</td></tr></table><p class="total">Total: ${b.currency} ${b.totalCost.toFixed(2)} | Per Piece: ${b.currency} ${b.costPerPiece.toFixed(2)}</p></body></html>`;
}
