package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.Project;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Persistent form of the {@link Project} aggregate root. The bridge and design space are 0..1 child rows; the
 * alternatives are an ordered child list merged by id (see {@link #apply(Project)}).
 */
@Entity
@Table(name = "project")
class ProjectEntity {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "created_utc", nullable = false)
    private Instant createdUtc;

    /** Not a foreign key: it is an id into the alternatives of this project, kept as the model keeps it. */
    @Column(name = "selected_alternative_id")
    private UUID selectedAlternativeId;

    /** Technical optimistic-lock counter only; not a domain revision. */
    @Version
    @Column(name = "row_version", nullable = false)
    private Long rowVersion;

    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private ProjectBridgeEntity bridge;

    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private ProjectDesignSpaceEntity designSpace;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordinal ASC")
    private List<BridgeAlternativeEntity> alternatives = new ArrayList<>();

    protected ProjectEntity() {
    }

    ProjectEntity(UUID id) {
        this.id = id;
    }

    /**
     * Makes this entity equal to the given project. Alternatives are merged by id: a stored one is updated in place,
     * a missing one is removed (orphan removal), a new one is added, and the ordinals follow the given order.
     * (Clearing and re-adding would make Hibernate INSERT before it DELETEs and violate the primary key.)
     */
    void apply(Project p) {
        this.projectName = p.getProjectName();
        // the column keeps microseconds: truncate here so the stored value is deterministic (not DB-dependent rounding)
        this.createdUtc = p.getCreatedUtc().truncatedTo(ChronoUnit.MICROS);
        this.selectedAlternativeId = p.getSelectedAlternativeId();

        if (p.getBridge() == null) {
            this.bridge = null;
        } else {
            if (this.bridge == null) {
                this.bridge = new ProjectBridgeEntity(this);
            }
            this.bridge.apply(p.getBridge());
        }

        if (p.getDesignSpace() == null) {
            this.designSpace = null;
        } else {
            if (this.designSpace == null) {
                this.designSpace = new ProjectDesignSpaceEntity(this);
            }
            this.designSpace.apply(p.getDesignSpace());
        }

        Map<UUID, BridgeAlternativeEntity> stored = new HashMap<>();
        for (BridgeAlternativeEntity e : alternatives) {
            stored.put(e.getId(), e);
        }
        List<BridgeAlternative> wanted = p.getGeneratedAlternatives();
        List<BridgeAlternativeEntity> merged = new ArrayList<>(wanted.size());
        for (int i = 0; i < wanted.size(); i++) {
            BridgeAlternative a = wanted.get(i);
            BridgeAlternativeEntity entity = stored.remove(a.id());
            if (entity == null) {
                entity = new BridgeAlternativeEntity(a.id(), this);
            }
            entity.apply(a, i);
            merged.add(entity);
        }
        alternatives.clear();
        alternatives.addAll(merged);
    }

    Project toDomain() {
        Project project = new Project();
        project.setId(id);
        project.setProjectName(projectName);
        project.setCreatedUtc(createdUtc);
        project.setBridge(bridge == null ? null : bridge.toDomain());
        project.setDesignSpace(designSpace == null ? null : designSpace.toDomain());
        project.setGeneratedAlternatives(alternatives.stream().map(BridgeAlternativeEntity::toDomain).toList());
        project.setSelectedAlternativeId(selectedAlternativeId);
        return project;
    }
}
