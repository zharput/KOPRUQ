package com.kopruq.bridge.api;

import com.kopruq.bridge.api.DesignSystemPutRequests.SectionPut;
import com.kopruq.bridge.api.GraphDtos.GraphDto;

/** Body of {@code PUT /api/projects/{projectId}/graphs/{graphId}}: the revision the client last saw, and the graph. */
public record GraphPutRequest(Long expectedRevision, GraphDto value) implements SectionPut<GraphDto> {
}
