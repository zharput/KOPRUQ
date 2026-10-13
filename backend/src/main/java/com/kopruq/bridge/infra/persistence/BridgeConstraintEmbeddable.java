package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.ConstraintKind;
import com.kopruq.bridge.model.BridgeConstraint;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/** One constraint row of a bridge definition (chainages in metres). */
@Embeddable
class BridgeConstraintEmbeddable {

    @Column(name = "constraint_id", nullable = false)
    private String id;
    @Enumerated(EnumType.STRING)
    @Column(name = "constraint_kind", nullable = false, length = 32)
    private ConstraintKind kind;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "start_chainage_m")
    private Double startChainageM;
    @Column(name = "end_chainage_m")
    private Double endChainageM;
    @Column(name = "note", nullable = false)
    private String note;

    protected BridgeConstraintEmbeddable() {
    }

    static BridgeConstraintEmbeddable from(BridgeConstraint c) {
        BridgeConstraintEmbeddable e = new BridgeConstraintEmbeddable();
        e.id = c.id();
        e.kind = c.kind();
        e.name = c.name();
        e.startChainageM = c.startChainageM();
        e.endChainageM = c.endChainageM();
        e.note = c.note();
        return e;
    }

    BridgeConstraint toDomain() {
        return new BridgeConstraint(id, kind, name, startChainageM, endChainageM, note);
    }
}
