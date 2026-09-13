package com.spanova.analysis;

/**
 * An externally-supplied uniformly distributed load on one element (e.g.
 * superimposed dead load, SDL) - as opposed to {@link SelfWeight}, whose
 * magnitude is computed from the element's own section/material. The
 * engineer supplies the magnitude directly; nothing is invented here.
 *
 * <p>{@code wxKnPerM}/{@code wyKnPerM}/{@code wzKnPerM}: force per unit
 * length along the GLOBAL axes, kN/m.
 */
public record UniformElementLoad(String loadCaseName, int elementId, double wxKnPerM, double wyKnPerM, double wzKnPerM) {
}
