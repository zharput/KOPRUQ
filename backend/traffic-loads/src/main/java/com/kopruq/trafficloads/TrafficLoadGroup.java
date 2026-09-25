package com.kopruq.trafficloads;

import java.util.List;

/**
 * A compatible-traffic-actions grouping per EN 1991-2 (e.g. gr1a, gr1b,
 * gr2...) - **not** an EN 1990 load combination (that's a separate,
 * future KOPRUQ module - never built here). TRAFFIC-P01 ships the
 * architecture only: {@code components} stays empty and {@code status}
 * stays {@code "NOT_DEFINED"} for every group - the exact EN 1991-2
 * group membership must come from validated engineering rules, not
 * from memory (spec section 22). Populating real group definitions is
 * a later, explicitly gated milestone.
 */
public record TrafficLoadGroup(String code, String name, String description, List<TrafficLoadGroupComponent> components, String status) {
}
