package com.kopruq.analysis;

/**
 * Self-weight applied to one load case, as a direction factor (typically
 * {@code (0, 0, -1)} for gravity along global -Z) - MIDAS computes the
 * actual magnitude itself from each element's section area and the
 * material's weight density, so no force value is invented here.
 */
public record SelfWeight(String loadCaseName, double factorX, double factorY, double factorZ) {
}
