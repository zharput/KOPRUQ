package com.kopruq.analysis;

/**
 * A static load case. {@code type} follows MIDAS's own load-type
 * vocabulary (e.g. "D" for Dead Load, "L" for Live Load) - kept verbatim
 * rather than translated into a KOPRUQ-specific enum, since MIDAS-P01
 * only needs to pass it through.
 */
public record LoadCase(String name, String type) {
}
