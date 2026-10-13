package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.GraphGroup;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Persistent form of one graph group. The group id is not unique (the frontend can repeat it). */
@Entity
@Table(name = "graph_group")
class GraphGroupEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "graph_document_id", nullable = false)
    private GraphDocumentEntity document;

    @Column(name = "group_index", nullable = false)
    private int groupIndex;

    @Column(name = "group_id", nullable = false)
    private String groupId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "color", nullable = false)
    private String color;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "graph_group_node", joinColumns = @JoinColumn(name = "graph_group_id"))
    @OrderColumn(name = "node_index")
    @Column(name = "node_id", nullable = false)
    private List<String> nodeIds = new ArrayList<>();

    protected GraphGroupEntity() {
    }

    GraphGroupEntity(GraphDocumentEntity document, int index, GraphGroup g) {
        this.document = document;
        this.groupIndex = index;
        this.groupId = g.id();
        this.name = g.name();
        this.color = g.color();
        this.nodeIds = new ArrayList<>(g.nodeIds());
    }

    GraphGroup toDomain() {
        return new GraphGroup(groupId, name, List.copyOf(nodeIds), color);
    }
}
