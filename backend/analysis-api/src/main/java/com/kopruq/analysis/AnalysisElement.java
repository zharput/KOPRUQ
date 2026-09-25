package com.kopruq.analysis;

/**
 * A beam element connecting two nodes. MIDAS-P01 scope: beam elements
 * only (a precast girder is modelled as a line element, not a solid) -
 * other element types (plate, truss, ...) are not needed yet and are
 * not modelled here.
 */
public record AnalysisElement(int id, int materialId, int sectionId, int nodeI, int nodeJ) {
}
