package com.spanova.trafficloads;

import java.util.List;

/**
 * The standard EN 1991-2 group CODE identifiers (gr1a...gr5) - names
 * only, per the engineer's own explicit scoping: "may contain groups
 * such as gr1a, gr1b, gr2, gr3, gr4, gr5... DO NOT invent group
 * membership from memory." Every group ships with empty {@code
 * components} and {@code status = "NOT_DEFINED"}, and a deliberately
 * generic description (NOT this project's own recollection of what
 * each group represents - that would be exactly the "membership from
 * memory" the engineer ruled out) until validated engineering rules
 * populate them, a later, explicitly gated milestone.
 */
public final class TrafficLoadGroupCatalog {

    private static final String NOT_YET_DEFINED = "Not yet defined - awaiting validated EN 1991-2 group rules.";

    public List<TrafficLoadGroup> placeholderGroups() {
        return List.of(
                notDefined("gr1a"),
                notDefined("gr1b"),
                notDefined("gr2"),
                notDefined("gr3"),
                notDefined("gr4"),
                notDefined("gr5"));
    }

    private static TrafficLoadGroup notDefined(String code) {
        return new TrafficLoadGroup(code, code, NOT_YET_DEFINED, List.of(), "NOT_DEFINED");
    }
}
