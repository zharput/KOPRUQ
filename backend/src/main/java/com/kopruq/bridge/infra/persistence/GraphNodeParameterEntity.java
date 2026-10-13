package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.GraphParameterKind;
import com.kopruq.bridge.model.GraphNodeParameter;
import com.kopruq.bridge.model.GraphParameterValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphBooleanValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberListValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphStringValue;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * Persistent form of one graph node parameter. {@code value_kind} says which value column is used; a NUMBER_ARRAY
 * keeps its (possibly empty) numbers in {@code graph_node_parameter_item}.
 */
@Entity
@Table(name = "graph_node_parameter")
class GraphNodeParameterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "graph_node_id", nullable = false)
    private GraphNodeEntity node;

    @Column(name = "parameter_index", nullable = false)
    private int parameterIndex;

    @Column(name = "parameter_key", nullable = false)
    private String parameterKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "value_kind", nullable = false, length = 16)
    private GraphParameterKind valueKind;

    @Column(name = "number_value")
    private Double numberValue;

    @Column(name = "boolean_value")
    private Boolean booleanValue;

    @Column(name = "string_value")
    private String stringValue;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "graph_node_parameter_item", joinColumns = @JoinColumn(name = "graph_node_parameter_id"))
    @OrderColumn(name = "item_index")
    @Column(name = "item_value", nullable = false)
    private List<Double> items = new ArrayList<>();

    protected GraphNodeParameterEntity() {
    }

    GraphNodeParameterEntity(GraphNodeEntity node, int index, GraphNodeParameter p) {
        this.node = node;
        this.parameterIndex = index;
        this.parameterKey = p.key();
        this.valueKind = p.value().kind();
        switch (p.value()) {
            case GraphNumberValue v -> this.numberValue = v.value();
            case GraphBooleanValue v -> this.booleanValue = v.value();
            case GraphStringValue v -> this.stringValue = v.value();
            case GraphNumberListValue v -> this.items = new ArrayList<>(v.values());
        }
    }

    GraphNodeParameter toDomain() {
        GraphParameterValue value = switch (valueKind) {
            case NUMBER -> new GraphNumberValue(numberValue);
            case BOOLEAN -> new GraphBooleanValue(booleanValue);
            case STRING -> new GraphStringValue(stringValue);
            case NUMBER_ARRAY -> new GraphNumberListValue(List.copyOf(items));
        };
        return new GraphNodeParameter(parameterKey, value);
    }
}
