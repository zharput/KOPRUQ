package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.kopruq.bridge.api.GraphDtos.GraphDto;
import com.kopruq.bridge.application.ProjectService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * The graph documents of a stored project. {@code PUT /graphs/{graphId}} upserts one graph if
 * {@code expectedRevision} is current (else 409): an existing graph keeps its position and is replaced whole, a new
 * one is appended. There is no delete and the value must not be null. CORS comes from the central policy.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/graphs")
public class ProjectGraphController {

    private final ProjectService projects;
    private final ProjectRequestReader reader;

    public ProjectGraphController(ProjectService projects, ProjectRequestReader reader) {
        this.projects = projects;
        this.reader = reader;
    }

    @PutMapping("/{graphId}")
    public SectionWriteResponse<GraphDto> putGraph(@PathVariable UUID projectId, @PathVariable String graphId,
            @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, GraphPutRequest.class,
                v -> GraphDocumentMapper.toModel(v, SectionPutFlow.VALUE, graphId), GraphDocumentMapper::toDto);
    }
}
