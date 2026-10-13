package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.BridgeInventoryType;
import com.kopruq.bridge.enums.InventoryPierShape;
import com.kopruq.bridge.model.BridgeInventoryRow;
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
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persistent form of one {@link BridgeInventoryRow}. The rows are replaced as a whole with their project (delete and
 * re-insert); {@code ordinal} keeps the order the client sent, {@code rowId} is the client-visible row id. The enums
 * are stored by constant name. A null girder-depth list is told from an empty one by {@code hasGirderDepths}.
 */
@Entity
@Table(name = "project_bridge_row")
class ProjectBridgeRowEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "row_id", nullable = false)
    private String rowId;

    @Column(name = "inventory_no", nullable = false)
    private String no;

    @Column(name = "km", nullable = false)
    private String km;

    @Column(name = "crossing_type", nullable = false)
    private String crossingType;

    @Column(name = "estimated_length_m", nullable = false)
    private double estimatedLengthM;

    @Column(name = "road_width_m", nullable = false)
    private double roadWidthM;

    @Column(name = "terrain", nullable = false)
    private String terrain;

    @Column(name = "status", nullable = false)
    private String status;

    @Enumerated(EnumType.STRING)
    @Column(name = "bridge_type", nullable = false, length = 32)
    private BridgeInventoryType bridgeType;

    @Column(name = "girder_note")
    private String girderNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "pier_shape", nullable = false, length = 32)
    private InventoryPierShape pierShape;

    @Column(name = "has_girder_depths", nullable = false)
    private boolean hasGirderDepths;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_bridge_row_span", joinColumns = @JoinColumn(name = "bridge_row_id"))
    @OrderColumn(name = "span_index")
    @Column(name = "length_m", nullable = false)
    private List<Double> spansM = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_bridge_row_girder_depth", joinColumns = @JoinColumn(name = "bridge_row_id"))
    @OrderColumn(name = "depth_index")
    @Column(name = "depth_cm", nullable = false)
    private List<Double> girderDepthCm = new ArrayList<>();

    protected ProjectBridgeRowEntity() {
    }

    ProjectBridgeRowEntity(UUID projectId, int ordinal, BridgeInventoryRow row) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.rowId = row.id();
        this.no = row.no();
        this.km = row.km();
        this.crossingType = row.crossingType();
        this.estimatedLengthM = row.estimatedLengthM();
        this.roadWidthM = row.roadWidthM();
        this.terrain = row.terrain();
        this.status = row.status();
        this.bridgeType = row.bridgeType();
        this.girderNote = row.girderNote();
        this.pierShape = row.pierShape();
        this.hasGirderDepths = row.girderDepthCm() != null;
        this.spansM = new ArrayList<>(row.spansM());
        this.girderDepthCm = row.girderDepthCm() == null ? new ArrayList<>() : new ArrayList<>(row.girderDepthCm());
    }

    BridgeInventoryRow toDomain() {
        return new BridgeInventoryRow(rowId, no, km, crossingType, estimatedLengthM, roadWidthM, terrain, status,
                bridgeType, List.copyOf(spansM), hasGirderDepths ? List.copyOf(girderDepthCm) : null, girderNote,
                pierShape);
    }
}
