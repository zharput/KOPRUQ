package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/**
 * JSON shapes of a graph document. A parameter is {@code {key, kind, value}}: {@code kind} is the constant name
 * (NUMBER, BOOLEAN, STRING, NUMBER_ARRAY) and {@code value} must be the matching JSON type. There is no
 * {@code activeGraphId} or other UI-only field; unknown fields are rejected.
 */
public final class GraphDtos {

    private GraphDtos() {
    }

    public record GraphDto(String id, String name, Integer schemaVersion, String projectId, String bridgeId,
            List<GraphNodeDto> nodes, List<GraphConnectionDto> connections, List<GraphGroupDto> groups) {
    }

    public record GraphNodeDto(String id, String type, String name, GraphPositionDto position,
            List<GraphParameterDto> parameters) {
    }

    public record GraphPositionDto(Double x, Double y) {
    }

    public record GraphParameterDto(String key, String kind, JsonNode value) {
    }

    public record GraphConnectionDto(String id, String sourceNodeId, String sourcePortId, String targetNodeId,
            String targetPortId) {
    }

    public record GraphGroupDto(String id, String name, List<String> nodeIds, String color) {
    }
}
