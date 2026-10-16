package com.kopruq.bridge.application;

import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.ProjectWorkspace;
import com.kopruq.landxml.application.LandXmlImportRepository;
import com.kopruq.shared.exception.ResourceNotFoundException;
import com.kopruq.terrain.application.TerrainRepository;
import org.springframework.transaction.support.TransactionOperations;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Use cases for stored projects: list, create, read, delete and revision-checked replacement of a section. Coordinates the
 * ports only; the revision rule lives in {@link Project}. Every use case runs in one transaction, so a failed write
 * leaves nothing behind. Wired as a bean in {@code CoreConfiguration}.
 */
public class ProjectService {

    private final ProjectRepository projects;
    private final ProjectContentRepository contents;
    private final TerrainRepository terrains;
    private final LandXmlImportRepository imports;
    private final TransactionOperations transactions;
    private final Clock clock;

    public ProjectService(ProjectRepository projects, ProjectContentRepository contents, TerrainRepository terrains,
            LandXmlImportRepository imports, TransactionOperations transactions, Clock clock) {
        this.projects = projects;
        this.contents = contents;
        this.terrains = terrains;
        this.imports = imports;
        this.transactions = transactions;
        this.clock = clock;
    }

    /** Newest change first; equal times by project id. */
    public List<ProjectSummary> list() {
        List<ProjectSummary> summaries = transactions.execute(status -> projects.findSummaries());
        return summaries.stream()
                .sorted(Comparator.comparing(ProjectSummary::updatedUtc).reversed()
                        .thenComparing(ProjectSummary::projectId))
                .toList();
    }

    public ProjectDocument create(ProjectWorkspace workspace) {
        return transactions.execute(status -> {
            Instant now = now();
            Project project = new Project();
            project.setProjectName(workspace.project().name());
            project.setCreatedUtc(now);
            project.restoreRevision(0, now);
            projects.save(project);
            contents.replace(project.getId(), workspace);
            return new ProjectDocument(project.getId(), project.getRevision(), project.getCreatedUtc(),
                    project.getUpdatedUtc(), ProjectContent.ofWorkspace(workspace));
        });
    }

    public ProjectDocument document(UUID projectId) {
        return transactions.execute(status -> {
            Project project = projects.findById(projectId).orElseThrow(() -> notFound(projectId));
            ProjectContent content = contents.load(projectId);
            return new ProjectDocument(project.getId(), project.getRevision(), project.getCreatedUtc(),
                    project.getUpdatedUtc(), content);
        });
    }

    /**
     * Replaces one section if {@code expectedRevision} is the project's current revision, then raises the revision.
     * A stale revision is rejected (409) before anything is written.
     */
    public ProjectRevision replace(UUID projectId, long expectedRevision, ProjectSection section) {
        return transactions.execute(status -> {
            Project project = projects.findByIdForUpdate(projectId).orElseThrow(() -> notFound(projectId));
            project.requireRevision(expectedRevision);
            contents.replace(projectId, section);
            if (section instanceof ProjectWorkspace workspace) {
                project.setProjectName(workspace.project().name());
            }
            project.recordChange(now());
            projects.save(project);
            return new ProjectRevision(project.getId(), project.getRevision(), project.getUpdatedUtc());
        });
    }

    /**
     * Deletes the project with all of its content (404 when unknown). The terrain dataset and LandXML import the
     * workspace points at are deleted too, but only when no remaining project still refers to them (directly, or
     * through an import of that terrain). Persistence reference coordination only; no engineering rule. One
     * transaction: a failing step leaves the project and every shared row untouched.
     */
    public void delete(UUID projectId) {
        transactions.executeWithoutResult(status -> {
            projects.findByIdForUpdate(projectId).orElseThrow(() -> notFound(projectId));
            ProjectWorkspace workspace = contents.load(projectId).workspace();
            String terrainId = null;
            String importId = null;
            if (workspace != null) {
                terrainId = workspace.project().environment().terrainDatasetId();
                importId = workspace.project().environment().landXmlImportId();
            }
            contents.deleteAll(projectId);
            projects.delete(projectId);
            deleteUnreferencedEnvironment(terrainId, importId);
        });
    }

    private void deleteUnreferencedEnvironment(String terrainId, String importId) {
        Set<String> candidateTerrains = new LinkedHashSet<>();
        if (terrainId != null) {
            candidateTerrains.add(terrainId);
        }
        if (importId != null) {
            imports.findTerrainId(importId).ifPresent(candidateTerrains::add);
            if (!contents.isLandXmlImportReferenced(importId)) {
                imports.deleteById(importId);
            }
        }
        for (String candidate : candidateTerrains) {
            deleteTerrainIfUnreferenced(candidate);
        }
    }

    /** Skips a terrain that a project or an import still used by a project refers to; else removes imports, then it. */
    private void deleteTerrainIfUnreferenced(String terrainId) {
        if (contents.isTerrainReferenced(terrainId)) {
            return;
        }
        List<String> terrainImports = imports.findIdsByTerrainId(terrainId);
        for (String terrainImport : terrainImports) {
            if (contents.isLandXmlImportReferenced(terrainImport)) {
                return;
            }
        }
        for (String terrainImport : terrainImports) {
            imports.deleteById(terrainImport);
        }
        terrains.deleteById(terrainId);
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private static ResourceNotFoundException notFound(UUID projectId) {
        return new ResourceNotFoundException("PROJECT_NOT_FOUND", "No project with id " + projectId);
    }
}
