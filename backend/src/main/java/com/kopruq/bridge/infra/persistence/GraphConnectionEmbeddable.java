package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.GraphConnection;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One connection row of a graph document (node and port ids are client strings, stored as given). */
@Embeddable
class GraphConnectionEmbeddable {

    @Column(name = "connection_id", nullable = false)
    private String id;
    @Column(name = "source_node_id", nullable = false)
    private String sourceNodeId;
    @Column(name = "source_port_id", nullable = false)
    private String sourcePortId;
    @Column(name = "target_node_id", nullable = false)
    private String targetNodeId;
    @Column(name = "target_port_id", nullable = false)
    private String targetPortId;

    protected GraphConnectionEmbeddable() {
    }

    static GraphConnectionEmbeddable from(GraphConnection c) {
        GraphConnectionEmbeddable e = new GraphConnectionEmbeddable();
        e.id = c.id();
        e.sourceNodeId = c.sourceNodeId();
        e.sourcePortId = c.sourcePortId();
        e.targetNodeId = c.targetNodeId();
        e.targetPortId = c.targetPortId();
        return e;
    }

    GraphConnection toDomain() {
        return new GraphConnection(id, sourceNodeId, sourcePortId, targetNodeId, targetPortId);
    }
}
