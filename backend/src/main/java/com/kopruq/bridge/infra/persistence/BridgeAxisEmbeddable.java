package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.BridgeAxisType;
import com.kopruq.bridge.model.BridgeAxis;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/** One axis row of a bridge definition (chainage and elevation in metres, skew in degrees). */
@Embeddable
class BridgeAxisEmbeddable {

    @Column(name = "axis_id", nullable = false)
    private String id;
    @Column(name = "name", nullable = false)
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(name = "axis_type", nullable = false, length = 16)
    private BridgeAxisType type;
    @Column(name = "chainage_m", nullable = false)
    private double chainageM;
    @Column(name = "elevation_m")
    private Double elevationM;
    @Column(name = "skew_degrees")
    private Double skewDegrees;

    protected BridgeAxisEmbeddable() {
    }

    static BridgeAxisEmbeddable from(BridgeAxis a) {
        BridgeAxisEmbeddable e = new BridgeAxisEmbeddable();
        e.id = a.id();
        e.name = a.name();
        e.type = a.type();
        e.chainageM = a.chainageM();
        e.elevationM = a.elevationM();
        e.skewDegrees = a.skewDegrees();
        return e;
    }

    BridgeAxis toDomain() {
        return new BridgeAxis(id, name, type, chainageM, elevationM, skewDegrees);
    }
}
