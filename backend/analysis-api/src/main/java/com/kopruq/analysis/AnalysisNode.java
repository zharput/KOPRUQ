package com.kopruq.analysis;

/** A structural node: id + global coordinates, in meters (SI). */
public record AnalysisNode(int id, double xM, double yM, double zM) {
}
