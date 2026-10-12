/**
 * Material relations, independent of any analysis port and of any framework.
 *
 * <p>{@link com.kopruq.materials.domain.EurocodeConcrete} holds the EN 1992-1-1 Table 3.1 concrete relations (SI, m and kN)
 * and {@link com.kopruq.materials.domain.ConcreteStrengthClasses} the strength-class identifiers the platform offers.
 * Moved out of {@code analysis-api} (BACKEND-ARCHITECTURE Faz 4): material relations are not part of a solver port.
 */
package com.kopruq.materials;
