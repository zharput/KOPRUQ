package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.kopruq.bridge.application.ProjectDocument;
import com.kopruq.bridge.application.ProjectRevision;
import com.kopruq.bridge.application.ProjectService;
import com.kopruq.bridge.model.ProjectWorkspace;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Stored projects: list, create, read, delete, and revision-checked replacement of the workspace. Request bodies are read
 * strictly (unknown fields are rejected) and validated structurally; the revision rule is in the domain
 * ({@code Project}) and the flow in {@link ProjectService}. CORS comes from the central policy.
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projects;
    private final ProjectRequestReader reader;

    public ProjectController(ProjectService projects, ProjectRequestReader reader) {
        this.projects = projects;
        this.reader = reader;
    }

    @GetMapping
    public List<ProjectSummaryResponse> list() {
        return projects.list().stream().map(ProjectSummaryResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<ProjectDocumentResponse> create(@RequestBody JsonNode body) {
        CreateProjectRequest request = reader.read(body, CreateProjectRequest.class);
        ProjectWorkspace workspace = ProjectWorkspaceMapper.toModel(request.workspace(), "workspace");
        ProjectDocument created = projects.create(workspace);
        return ResponseEntity.created(URI.create("/api/projects/" + created.projectId()))
                .body(ProjectDocumentResponse.from(created));
    }

    @GetMapping("/{projectId}")
    public ProjectDocumentResponse get(@PathVariable UUID projectId) {
        return ProjectDocumentResponse.from(projects.document(projectId));
    }

    /** Deletes the project and its content (204); 404 {@code PROJECT_NOT_FOUND} for an unknown id. */
    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> delete(@PathVariable UUID projectId) {
        projects.delete(projectId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{projectId}/workspace")
    public WorkspaceWriteResponse putWorkspace(@PathVariable UUID projectId, @RequestBody JsonNode body) {
        WorkspacePutRequest request = reader.read(body, WorkspacePutRequest.class);
        List<FieldViolation> violations = new ArrayList<>();
        if (request.expectedRevision() == null) {
            violations.add(new FieldViolation("expectedRevision", "is required"));
        }
        ProjectWorkspace workspace = null;
        try {
            workspace = ProjectWorkspaceMapper.toModel(request.value(), "value");
        } catch (InvalidRequestException e) {
            violations.addAll(e.violations());
        }
        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
        ProjectRevision revision = projects.replace(projectId, request.expectedRevision(), workspace);
        return new WorkspaceWriteResponse(revision.projectId(), revision.revision(), revision.updatedUtc(),
                ProjectWorkspaceMapper.toDto(workspace));
    }
}
