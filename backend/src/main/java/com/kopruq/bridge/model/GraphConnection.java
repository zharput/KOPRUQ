package com.kopruq.bridge.model;

/** A connection between two node ports of a graph. Port ids are stored as given. */
public record GraphConnection(String id, String sourceNodeId, String sourcePortId, String targetNodeId,
        String targetPortId) {

    public GraphConnection {
        SectionInvariants.notBlank("id", id);
        SectionInvariants.required("sourceNodeId", sourceNodeId);
        SectionInvariants.required("sourcePortId", sourcePortId);
        SectionInvariants.required("targetNodeId", targetNodeId);
        SectionInvariants.required("targetPortId", targetPortId);
    }
}
