package com.kopruq.bridge.model;

import java.util.List;

/** A visual group of nodes. The group id is not required to be unique (the frontend can repeat it). */
public record GraphGroup(String id, String name, List<String> nodeIds, String color) {

    public GraphGroup {
        SectionInvariants.required("id", id);
        SectionInvariants.required("name", name);
        nodeIds = SectionInvariants.copyNonNull("nodeIds", nodeIds);
        SectionInvariants.required("color", color);
    }
}
