package com.kopruq.bridge.infra;

import com.kopruq.bridge.application.ProjectRepository;
import com.kopruq.bridge.application.ProjectSummary;
import com.kopruq.bridge.model.Project;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Test double of the {@link ProjectRepository} port; stores and returns copies, like a real store would. */
public class InMemoryProjectRepository implements ProjectRepository {

    private final Map<UUID, Project> stored = new LinkedHashMap<>();

    @Override
    public Project save(Project project) {
        stored.put(project.getId(), copy(project));
        return project;
    }

    @Override
    public Optional<Project> findById(UUID id) {
        return Optional.ofNullable(stored.get(id)).map(InMemoryProjectRepository::copy);
    }

    @Override
    public Optional<Project> findByIdForUpdate(UUID id) {
        return findById(id);
    }

    @Override
    public void delete(UUID id) {
        stored.remove(id);
    }

    @Override
    public List<ProjectSummary> findSummaries() {
        return stored.values().stream()
                .map(p -> new ProjectSummary(p.getId(), p.getProjectName(), p.getRevision(), p.getCreatedUtc(),
                        p.getUpdatedUtc()))
                .toList();
    }

    private static Project copy(Project p) {
        Project c = new Project();
        c.setId(p.getId());
        c.setProjectName(p.getProjectName());
        c.setCreatedUtc(p.getCreatedUtc());
        c.restoreRevision(p.getRevision(), p.getUpdatedUtc());
        c.setBridge(p.getBridge());
        c.setDesignSpace(p.getDesignSpace());
        c.setGeneratedAlternatives(p.getGeneratedAlternatives());
        c.setSelectedAlternativeId(p.getSelectedAlternativeId());
        return c;
    }
}
