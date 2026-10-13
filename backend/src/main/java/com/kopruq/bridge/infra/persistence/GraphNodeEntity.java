package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.GraphNode;
import com.kopruq.bridge.model.GraphNodeParameter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Persistent form of one graph node; the node type is stored as given. Parameters are LAZY child rows. */
@Entity
@Table(name = "graph_node")
class GraphNodeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "graph_document_id", nullable = false)
    private GraphDocumentEntity document;

    @Column(name = "node_index", nullable = false)
    private int nodeIndex;

    @Column(name = "node_id", nullable = false)
    private String nodeId;

    @Column(name = "node_type", nullable = false)
    private String nodeType;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "position_x", nullable = false)
    private double positionX;

    @Column(name = "position_y", nullable = false)
    private double positionY;

    @OneToMany(mappedBy = "node", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("parameterIndex ASC")
    private List<GraphNodeParameterEntity> parameters = new ArrayList<>();

    protected GraphNodeEntity() {
    }

    GraphNodeEntity(GraphDocumentEntity document, int index, GraphNode n) {
        this.document = document;
        this.nodeIndex = index;
        this.nodeId = n.id();
        this.nodeType = n.type();
        this.name = n.name();
        this.positionX = n.positionX();
        this.positionY = n.positionY();
        List<GraphNodeParameter> source = n.parameters();
        for (int i = 0; i < source.size(); i++) {
            parameters.add(new GraphNodeParameterEntity(this, i, source.get(i)));
        }
    }

    GraphNode toDomain() {
        return new GraphNode(nodeId, nodeType, name, positionX, positionY,
                parameters.stream().map(GraphNodeParameterEntity::toDomain).toList());
    }
}
