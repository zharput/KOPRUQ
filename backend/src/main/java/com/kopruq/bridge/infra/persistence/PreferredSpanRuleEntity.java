package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.PreferredSpanRule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of one {@link PreferredSpanRule}; spans are metres. The rule id is not unique. */
@Entity
@Table(name = "preferred_span_rule")
class PreferredSpanRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "rule_id", nullable = false)
    private String ruleId;

    @Column(name = "superstructure_type", nullable = false)
    private String superstructureType;

    @Column(name = "girder_variant_id", nullable = false)
    private String girderVariantId;

    @Column(name = "min_span_m", nullable = false)
    private double minSpanM;

    @Column(name = "max_span_m", nullable = false)
    private double maxSpanM;

    @Column(name = "span_delta_m", nullable = false)
    private double spanDeltaM;

    @Column(name = "primary_span_m", nullable = false)
    private double primarySpanM;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "source", nullable = false)
    private String source;

    protected PreferredSpanRuleEntity() {
    }

    PreferredSpanRuleEntity(UUID projectId, int ordinal, PreferredSpanRule r) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.ruleId = r.id();
        this.superstructureType = r.superstructureType();
        this.girderVariantId = r.girderVariantId();
        this.minSpanM = r.minSpan();
        this.maxSpanM = r.maxSpan();
        this.spanDeltaM = r.spanDelta();
        this.primarySpanM = r.primarySpan();
        this.enabled = r.enabled();
        this.source = r.source();
    }

    PreferredSpanRule toDomain() {
        return new PreferredSpanRule(ruleId, superstructureType, girderVariantId, minSpanM, maxSpanM, spanDeltaM,
                primarySpanM, enabled, source);
    }
}
