package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.GraphConnection;
import com.kopruq.bridge.model.GraphDocument;
import com.kopruq.bridge.model.GraphGroup;
import com.kopruq.bridge.model.GraphNode;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persistent form of one {@link GraphDocument}. {@code ordinal} keeps the creation order of the project's graphs.
 * Nodes and groups are child entities (own surrogate ids, their order kept in an index column); connections are an
 * element collection. Every child collection is LAZY, so {@link #toDomain()} must run inside the repository's
 * transaction. {@code has_groups} tells a missing {@code groups} (null) from an empty one.
 */
@Entity
@Table(name = "graph_document")
class GraphDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "graph_id", nullable = false)
    private String graphId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(name = "owner_project_id")
    private String ownerProjectId;

    @Column(name = "owner_bridge_id")
    private String ownerBridgeId;

    @Column(name = "has_groups", nullable = false)
    private boolean hasGroups;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("nodeIndex ASC")
    private List<GraphNodeEntity> nodes = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "graph_connection", joinColumns = @JoinColumn(name = "graph_document_id"))
    @OrderColumn(name = "connection_index")
    private List<GraphConnectionEmbeddable> connections = new ArrayList<>();

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("groupIndex ASC")
    private List<GraphGroupEntity> groups = new ArrayList<>();

    protected GraphDocumentEntity() {
    }

    GraphDocumentEntity(UUID projectId, int ordinal, GraphDocument g) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.graphId = g.id();
        this.name = g.name();
        this.schemaVersion = g.schemaVersion();
        this.ownerProjectId = g.projectId();
        this.ownerBridgeId = g.bridgeId();
        this.hasGroups = g.groups() != null;
        for (int i = 0; i < g.nodes().size(); i++) {
            nodes.add(new GraphNodeEntity(this, i, g.nodes().get(i)));
        }
        for (GraphConnection c : g.connections()) {
            connections.add(GraphConnectionEmbeddable.from(c));
        }
        if (g.groups() != null) {
            for (int i = 0; i < g.groups().size(); i++) {
                groups.add(new GraphGroupEntity(this, i, g.groups().get(i)));
            }
        }
    }

    int getOrdinal() {
        return ordinal;
    }

    GraphDocument toDomain() {
        List<GraphNode> domainNodes = nodes.stream().map(GraphNodeEntity::toDomain).toList();
        List<GraphGroup> domainGroups = hasGroups ? groups.stream().map(GraphGroupEntity::toDomain).toList() : null;
        return new GraphDocument(graphId, name, schemaVersion, ownerProjectId, ownerBridgeId, domainNodes,
                connections.stream().map(GraphConnectionEmbeddable::toDomain).toList(), domainGroups);
    }
}
