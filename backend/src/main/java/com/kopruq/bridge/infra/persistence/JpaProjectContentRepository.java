package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.application.ProjectContentRepository;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.BridgeInventoryRow;
import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.ProjectWorkspace;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** JPA adapter of the {@link ProjectContentRepository} port (the workspace; the design-system sections go through the {@link DesignSystemContentStore}). */
@Repository
@Transactional
public class JpaProjectContentRepository implements ProjectContentRepository {

    private final ProjectJpaRepository projects;
    private final ProjectInfoJpaRepository infos;
    private final ProjectBridgeRowJpaRepository rows;
    private final DesignSystemContentStore designSystem;

    public JpaProjectContentRepository(ProjectJpaRepository projects, ProjectInfoJpaRepository infos,
            ProjectBridgeRowJpaRepository rows, DesignSystemContentStore designSystem) {
        this.projects = projects;
        this.infos = infos;
        this.rows = rows;
        this.designSystem = designSystem;
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectContent load(UUID projectId) {
        return designSystem.load(projectId, loadWorkspace(projectId));
    }

    /** The workspace, or null when the project has no {@code project_info} row yet. */
    private ProjectWorkspace loadWorkspace(UUID projectId) {
        ProjectInfoEntity info = infos.findById(projectId).orElse(null);
        if (info == null) {
            return null;
        }
        String name = projects.findById(projectId).map(ProjectEntity::getProjectName).orElse("");
        List<BridgeInventoryRow> bridges = new ArrayList<>();
        for (ProjectBridgeRowEntity row : rows.findByProjectIdOrderByOrdinalAsc(projectId)) {
            bridges.add(row.toDomain());
        }
        return new ProjectWorkspace(info.toDomain(name), bridges);
    }

    @Override
    public void replace(UUID projectId, ProjectSection section) {
        switch (section) {
            case ProjectWorkspace workspace -> replaceWorkspace(projectId, workspace);
            case BridgeDefinitions s -> designSystem.replace(projectId, s);
            case PierFamilyCatalog s -> designSystem.replace(projectId, s);
            case PierCapFamilyCatalog s -> designSystem.replace(projectId, s);
            case FoundationFamilyCatalog s -> designSystem.replace(projectId, s);
            case BearingFamilyCatalog s -> designSystem.replace(projectId, s);
            case MaterialAssignmentCatalog s -> designSystem.replace(projectId, s);
            case GirderLibrarySection s -> designSystem.replace(projectId, s);
            case PreferredSpanRulesSection s -> designSystem.replace(projectId, s);
            case CrossSectionSection s -> designSystem.replace(projectId, s);
        }
    }

    private void replaceWorkspace(UUID projectId, ProjectWorkspace workspace) {
        ProjectInfoEntity entity = infos.findById(projectId).orElseGet(() -> new ProjectInfoEntity(projectId));
        entity.apply(workspace.project());
        infos.save(entity);

        rows.deleteByProjectId(projectId);
        // Hibernate runs INSERTs before DELETEs: flush the delete first or UNIQUE (project_id, row_id) is violated.
        rows.flush();

        List<ProjectBridgeRowEntity> fresh = new ArrayList<>();
        List<BridgeInventoryRow> bridges = workspace.bridges();
        for (int i = 0; i < bridges.size(); i++) {
            fresh.add(new ProjectBridgeRowEntity(projectId, i, bridges.get(i)));
        }
        rows.saveAll(fresh);
        rows.flush();
    }
}
