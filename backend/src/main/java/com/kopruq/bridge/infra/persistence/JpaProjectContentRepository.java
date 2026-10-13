package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.application.ProjectContentRepository;
import com.kopruq.bridge.model.BridgeInventoryRow;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.ProjectWorkspace;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** JPA adapter of the {@link ProjectContentRepository} port (M1: the workspace section). */
@Repository
@Transactional
public class JpaProjectContentRepository implements ProjectContentRepository {

    private final ProjectJpaRepository projects;
    private final ProjectInfoJpaRepository infos;
    private final ProjectBridgeRowJpaRepository rows;

    public JpaProjectContentRepository(ProjectJpaRepository projects, ProjectInfoJpaRepository infos,
            ProjectBridgeRowJpaRepository rows) {
        this.projects = projects;
        this.infos = infos;
        this.rows = rows;
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectContent load(UUID projectId) {
        ProjectInfoEntity info = infos.findById(projectId).orElse(null);
        if (info == null) {
            return new ProjectContent(null);
        }
        String name = projects.findById(projectId).map(ProjectEntity::getProjectName).orElse("");
        List<BridgeInventoryRow> bridges = new ArrayList<>();
        for (ProjectBridgeRowEntity row : rows.findByProjectIdOrderByOrdinalAsc(projectId)) {
            bridges.add(row.toDomain());
        }
        return new ProjectContent(new ProjectWorkspace(info.toDomain(name), bridges));
    }

    @Override
    public void replace(UUID projectId, ProjectSection section) {
        switch (section) {
            case ProjectWorkspace workspace -> replaceWorkspace(projectId, workspace);
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
