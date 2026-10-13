package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.AxisFamilyAssignment;
import com.kopruq.bridge.model.BridgeAxis;
import com.kopruq.bridge.model.BridgeConstraint;
import com.kopruq.bridge.model.BridgeDefinition;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persistent form of one {@link BridgeDefinition}. The four child lists are LAZY (an EAGER fetch of several lists
 * would join them into a Cartesian product); {@link #toDomain()} must run inside the repository's transaction. The
 * lists keep their order through {@code @OrderColumn}; {@code ordinal} keeps the definition order.
 */
@Entity
@Table(name = "bridge_definition")
class BridgeDefinitionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "definition_key", nullable = false)
    private String definitionKey;

    @Column(name = "bridge_id", nullable = false)
    private String bridgeId;

    @Column(name = "superstructure_type", nullable = false)
    private String superstructureType;

    @Column(name = "girder_family_id")
    private String girderFamilyId;

    @Column(name = "girder_variant_id")
    private String girderVariantId;

    @Column(name = "girder_count")
    private Double girderCount;

    @Column(name = "deck_width_override_m")
    private Double deckWidthOverrideM;

    @Column(name = "abutment_a1_family_id")
    private String abutmentA1FamilyId;

    @Column(name = "abutment_a2_family_id")
    private String abutmentA2FamilyId;

    @Column(name = "construction_method", nullable = false)
    private String constructionMethod;

    @Column(name = "construction_stages_note", nullable = false)
    private String constructionStagesNote;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "bridge_definition_span", joinColumns = @JoinColumn(name = "bridge_definition_id"))
    @OrderColumn(name = "span_index")
    @Column(name = "length_m", nullable = false)
    private List<Double> spanLengthsM = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "bridge_definition_axis", joinColumns = @JoinColumn(name = "bridge_definition_id"))
    @OrderColumn(name = "axis_index")
    private List<BridgeAxisEmbeddable> axes = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "bridge_definition_axis_assignment",
            joinColumns = @JoinColumn(name = "bridge_definition_id"))
    @OrderColumn(name = "assignment_index")
    private List<AxisAssignmentEmbeddable> axisAssignments = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "bridge_definition_constraint", joinColumns = @JoinColumn(name = "bridge_definition_id"))
    @OrderColumn(name = "constraint_index")
    private List<BridgeConstraintEmbeddable> constraints = new ArrayList<>();

    protected BridgeDefinitionEntity() {
    }

    BridgeDefinitionEntity(UUID projectId, int ordinal, BridgeDefinition d) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.definitionKey = d.definitionKey();
        this.bridgeId = d.bridgeId();
        this.superstructureType = d.superstructureType();
        this.girderFamilyId = d.girderFamilyId();
        this.girderVariantId = d.girderVariantId();
        this.girderCount = d.girderCount();
        this.deckWidthOverrideM = d.deckWidthOverrideM();
        this.abutmentA1FamilyId = d.abutmentA1FamilyId();
        this.abutmentA2FamilyId = d.abutmentA2FamilyId();
        this.constructionMethod = d.constructionMethod();
        this.constructionStagesNote = d.constructionStagesNote();
        this.spanLengthsM = new ArrayList<>(d.spanLengthsM());
        for (BridgeAxis a : d.axes()) {
            axes.add(BridgeAxisEmbeddable.from(a));
        }
        for (AxisFamilyAssignment a : d.axisAssignments()) {
            axisAssignments.add(AxisAssignmentEmbeddable.from(a));
        }
        for (BridgeConstraint c : d.constraints()) {
            constraints.add(BridgeConstraintEmbeddable.from(c));
        }
    }

    BridgeDefinition toDomain() {
        return new BridgeDefinition(definitionKey, bridgeId, List.copyOf(spanLengthsM),
                axes.stream().map(BridgeAxisEmbeddable::toDomain).toList(), superstructureType, girderFamilyId,
                girderVariantId, girderCount, deckWidthOverrideM,
                axisAssignments.stream().map(AxisAssignmentEmbeddable::toDomain).toList(), abutmentA1FamilyId,
                abutmentA2FamilyId, constructionMethod, constructionStagesNote,
                constraints.stream().map(BridgeConstraintEmbeddable::toDomain).toList());
    }
}
