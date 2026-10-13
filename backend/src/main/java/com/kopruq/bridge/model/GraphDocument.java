package com.kopruq.bridge.model;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * One graph document of a project (the frontend {@code KopruqGraph}). Structural rules only: unique non-blank node
 * and connection ids, connections and groups refer to existing nodes. {@code groups} is optional (null and empty
 * differ); the owning {@code projectId} / {@code bridgeId} are optional client strings. Port ids and node types are
 * not checked against any registry.
 */
public record GraphDocument(String id, String name, int schemaVersion, String projectId, String bridgeId,
        List<GraphNode> nodes, List<GraphConnection> connections, List<GraphGroup> groups) implements ProjectSection {

    public static final int SCHEMA_VERSION = 1;

    public GraphDocument {
        SectionInvariants.notBlank("id", id);
        SectionInvariants.required("name", name);
        if (schemaVersion != SCHEMA_VERSION) {
            throw new IllegalArgumentException("schemaVersion must be " + SCHEMA_VERSION);
        }
        nodes = SectionInvariants.copyNonNull("nodes", nodes);
        connections = SectionInvariants.copyNonNull("connections", connections);
        groups = SectionInvariants.copyNonNullOrNull("groups", groups);
        SectionInvariants.uniqueNonBlank("node", nodes, GraphNode::id);
        SectionInvariants.uniqueNonBlank("connection", connections, GraphConnection::id);
        Set<String> nodeIds = new HashSet<>();
        nodes.forEach(n -> nodeIds.add(n.id()));
        for (GraphConnection c : connections) {
            if (!nodeIds.contains(c.sourceNodeId())) {
                throw new IllegalArgumentException("connection " + c.id() + " refers to unknown source node "
                        + c.sourceNodeId());
            }
            if (!nodeIds.contains(c.targetNodeId())) {
                throw new IllegalArgumentException("connection " + c.id() + " refers to unknown target node "
                        + c.targetNodeId());
            }
        }
        if (groups != null) {
            for (GraphGroup g : groups) {
                for (String nodeId : g.nodeIds()) {
                    if (!nodeIds.contains(nodeId)) {
                        throw new IllegalArgumentException("group " + g.id() + " refers to unknown node " + nodeId);
                    }
                }
            }
        }
    }
}
