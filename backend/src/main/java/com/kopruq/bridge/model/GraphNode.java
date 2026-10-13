package com.kopruq.bridge.model;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A node of a graph. The node type is stored as given (no registry copy). Parameter keys are unique within the node,
 * the order of the parameters is kept.
 */
public record GraphNode(String id, String type, String name, double positionX, double positionY,
        List<GraphNodeParameter> parameters) {

    public GraphNode {
        SectionInvariants.notBlank("id", id);
        SectionInvariants.required("type", type);
        SectionInvariants.required("name", name);
        SectionInvariants.finite("positionX", positionX);
        SectionInvariants.finite("positionY", positionY);
        parameters = SectionInvariants.copyNonNull("parameters", parameters);
        Set<String> keys = new HashSet<>();
        for (GraphNodeParameter p : parameters) {
            if (!keys.add(p.key())) {
                throw new IllegalArgumentException("parameter key is duplicated: " + p.key());
            }
        }
    }
}
