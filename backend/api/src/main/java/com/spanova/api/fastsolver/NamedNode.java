package com.spanova.api.fastsolver;

/** A node the fast-solver result report should show by a human label (e.g. "C1", "P2-Left"). */
public record NamedNode(String label, int nodeId, double chainageM) {
}
