package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.BooleanNode;
import com.fasterxml.jackson.databind.node.DoubleNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.TextNode;
import com.kopruq.bridge.api.GraphDtos.GraphConnectionDto;
import com.kopruq.bridge.api.GraphDtos.GraphDto;
import com.kopruq.bridge.api.GraphDtos.GraphGroupDto;
import com.kopruq.bridge.api.GraphDtos.GraphNodeDto;
import com.kopruq.bridge.api.GraphDtos.GraphParameterDto;
import com.kopruq.bridge.api.GraphDtos.GraphPositionDto;
import com.kopruq.bridge.enums.GraphParameterKind;
import com.kopruq.bridge.model.GraphConnection;
import com.kopruq.bridge.model.GraphDocument;
import com.kopruq.bridge.model.GraphGroup;
import com.kopruq.bridge.model.GraphNode;
import com.kopruq.bridge.model.GraphNodeParameter;
import com.kopruq.bridge.model.GraphParameterValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphBooleanValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberListValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphNumberValue;
import com.kopruq.bridge.model.GraphParameterValue.GraphStringValue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Converts a graph JSON shape to the model and back. Only structure is checked: required fields, finite numbers, the
 * schema version, unique non-blank node and connection ids, unique parameter keys, a parameter value matching its
 * kind, and node references of connections and groups. Port ids and node types are not checked (no registry copy);
 * group ids need not be unique. Values pass through untouched.
 */
final class GraphDocumentMapper {

    private GraphDocumentMapper() {
    }

    static GraphDocument toModel(GraphDto dto, String path, String graphId) {
        SectionChecks c = new SectionChecks();
        if (dto == null) {
            c.add(path, "is required");
            c.throwIfAny();
        }
        String id = c.id(path + ".id", dto.id());
        if (id != null && !id.isBlank() && !id.equals(graphId)) {
            c.add(path + ".id", "must equal the graphId in the path");
        }
        String name = c.text(path + ".name", dto.name());
        int schemaVersion = GraphDocument.SCHEMA_VERSION;
        if (dto.schemaVersion() == null) {
            c.add(path + ".schemaVersion", "is required");
        } else if (dto.schemaVersion() != GraphDocument.SCHEMA_VERSION) {
            c.add(path + ".schemaVersion", "must be " + GraphDocument.SCHEMA_VERSION);
        }

        List<GraphNode> nodes = List.of();
        Set<String> nodeIds = new HashSet<>();
        if (dto.nodes() == null) {
            c.add(path + ".nodes", "is required");
        } else {
            nodes = c.list(path + ".nodes", dto.nodes(), (d, p) -> node(c, p, d));
            c.unique(path + ".nodes", dto.nodes(), GraphNodeDto::id, "id");
            for (GraphNodeDto n : dto.nodes()) {
                if (n != null && n.id() != null) {
                    nodeIds.add(n.id());
                }
            }
        }

        List<GraphConnection> connections = List.of();
        if (dto.connections() == null) {
            c.add(path + ".connections", "is required");
        } else {
            connections = c.list(path + ".connections", dto.connections(), (d, p) -> connection(c, p, d, nodeIds));
            c.unique(path + ".connections", dto.connections(), GraphConnectionDto::id, "id");
        }

        List<GraphGroup> groups = null;
        if (dto.groups() != null) {
            groups = c.list(path + ".groups", dto.groups(), (d, p) -> group(c, p, d, nodeIds));
        }
        c.throwIfAny();
        return new GraphDocument(id, name, schemaVersion, dto.projectId(), dto.bridgeId(), nodes, connections, groups);
    }

    private static GraphNode node(SectionChecks c, String p, GraphNodeDto d) {
        int before = c.count();
        String id = c.id(p + ".id", d.id());
        String type = c.text(p + ".type", d.type());
        String name = c.text(p + ".name", d.name());
        double x = 0;
        double y = 0;
        GraphPositionDto position = d.position();
        if (position == null) {
            c.add(p + ".position", "is required");
        } else {
            x = c.requiredFinite(p + ".position.x", position.x());
            y = c.requiredFinite(p + ".position.y", position.y());
        }
        List<GraphNodeParameter> parameters = List.of();
        if (d.parameters() == null) {
            c.add(p + ".parameters", "is required");
        } else {
            parameters = c.list(p + ".parameters", d.parameters(), (pd, pp) -> parameter(c, pp, pd));
            uniqueKeys(c, p + ".parameters", d.parameters());
        }
        if (c.count() > before) {
            return null;
        }
        return new GraphNode(id, type, name, x, y, parameters);
    }

    /** Parameter keys must be unique; unlike ids the empty string is a legal key, so it is checked here. */
    private static void uniqueKeys(SectionChecks c, String listPath, List<GraphParameterDto> dtos) {
        Map<String, Integer> first = new HashMap<>();
        for (int i = 0; i < dtos.size(); i++) {
            GraphParameterDto d = dtos.get(i);
            if (d == null || d.key() == null) {
                continue;
            }
            Integer seen = first.putIfAbsent(d.key(), i);
            if (seen != null) {
                c.add(listPath + "[" + i + "].key", "duplicates parameters[" + seen + "].key");
            }
        }
    }

    private static GraphNodeParameter parameter(SectionChecks c, String p, GraphParameterDto d) {
        int before = c.count();
        String key = c.text(p + ".key", d.key());
        GraphParameterKind kind = c.requiredEnum(p + ".kind", d.kind(), GraphParameterKind.class);
        GraphParameterValue value = parameterValue(c, p + ".value", kind, d.value());
        if (c.count() > before) {
            return null;
        }
        return new GraphNodeParameter(key, value);
    }

    private static GraphParameterValue parameterValue(SectionChecks c, String p, GraphParameterKind kind,
            JsonNode node) {
        if (node == null || node.isNull()) {
            c.add(p, "is required");
            return null;
        }
        if (kind == null) {
            return null;
        }
        switch (kind) {
            case NUMBER:
                if (!node.isNumber()) {
                    c.add(p, "must be a number");
                    return null;
                }
                if (!Double.isFinite(node.doubleValue())) {
                    c.add(p, "must be a finite number");
                    return null;
                }
                return new GraphNumberValue(node.doubleValue());
            case BOOLEAN:
                if (!node.isBoolean()) {
                    c.add(p, "must be a boolean");
                    return null;
                }
                return new GraphBooleanValue(node.booleanValue());
            case STRING:
                if (!node.isTextual()) {
                    c.add(p, "must be a string");
                    return null;
                }
                return new GraphStringValue(node.textValue());
            case NUMBER_ARRAY:
                if (!node.isArray()) {
                    c.add(p, "must be an array of numbers");
                    return null;
                }
                int before = c.count();
                List<Double> numbers = new ArrayList<>();
                for (int i = 0; i < node.size(); i++) {
                    JsonNode element = node.get(i);
                    if (!element.isNumber()) {
                        c.add(p + "[" + i + "]", "must be a number");
                    } else if (!Double.isFinite(element.doubleValue())) {
                        c.add(p + "[" + i + "]", "must be a finite number");
                    } else {
                        numbers.add(element.doubleValue());
                    }
                }
                return c.count() > before ? null : new GraphNumberListValue(numbers);
            default:
                return null;
        }
    }

    private static GraphConnection connection(SectionChecks c, String p, GraphConnectionDto d, Set<String> nodeIds) {
        int before = c.count();
        String id = c.id(p + ".id", d.id());
        String sourceNode = c.text(p + ".sourceNodeId", d.sourceNodeId());
        String sourcePort = c.text(p + ".sourcePortId", d.sourcePortId());
        String targetNode = c.text(p + ".targetNodeId", d.targetNodeId());
        String targetPort = c.text(p + ".targetPortId", d.targetPortId());
        if (sourceNode != null && !nodeIds.contains(sourceNode)) {
            c.add(p + ".sourceNodeId", "must refer to the id of a node in nodes");
        }
        if (targetNode != null && !nodeIds.contains(targetNode)) {
            c.add(p + ".targetNodeId", "must refer to the id of a node in nodes");
        }
        if (c.count() > before) {
            return null;
        }
        return new GraphConnection(id, sourceNode, sourcePort, targetNode, targetPort);
    }

    private static GraphGroup group(SectionChecks c, String p, GraphGroupDto d, Set<String> nodeIds) {
        int before = c.count();
        String id = c.text(p + ".id", d.id());
        String name = c.text(p + ".name", d.name());
        String color = c.text(p + ".color", d.color());
        List<String> members = List.of();
        if (d.nodeIds() == null) {
            c.add(p + ".nodeIds", "is required");
        } else {
            members = new ArrayList<>();
            for (int i = 0; i < d.nodeIds().size(); i++) {
                String nodeId = d.nodeIds().get(i);
                String memberPath = p + ".nodeIds[" + i + "]";
                if (nodeId == null) {
                    c.add(memberPath, "is required");
                } else if (!nodeIds.contains(nodeId)) {
                    c.add(memberPath, "must refer to the id of a node in nodes");
                } else {
                    members.add(nodeId);
                }
            }
        }
        if (c.count() > before) {
            return null;
        }
        return new GraphGroup(id, name, members, color);
    }

    // ------------------------------------------------------------------ to dto

    static GraphDto toDto(GraphDocument g) {
        return new GraphDto(g.id(), g.name(), g.schemaVersion(), g.projectId(), g.bridgeId(),
                g.nodes().stream().map(GraphDocumentMapper::nodeDto).toList(),
                g.connections().stream().map(GraphDocumentMapper::connectionDto).toList(),
                g.groups() == null ? null : g.groups().stream().map(GraphDocumentMapper::groupDto).toList());
    }

    static List<GraphDto> toDtos(List<GraphDocument> graphs) {
        return graphs.stream().map(GraphDocumentMapper::toDto).toList();
    }

    private static GraphNodeDto nodeDto(GraphNode n) {
        return new GraphNodeDto(n.id(), n.type(), n.name(), new GraphPositionDto(n.positionX(), n.positionY()),
                n.parameters().stream().map(GraphDocumentMapper::parameterDto).toList());
    }

    private static GraphParameterDto parameterDto(GraphNodeParameter p) {
        JsonNodeFactory f = JsonNodeFactory.instance;
        JsonNode value = switch (p.value()) {
            case GraphNumberValue v -> DoubleNode.valueOf(v.value());
            case GraphBooleanValue v -> BooleanNode.valueOf(v.value());
            case GraphStringValue v -> TextNode.valueOf(v.value());
            case GraphNumberListValue v -> {
                ArrayNode array = f.arrayNode();
                v.values().forEach(array::add);
                yield array;
            }
        };
        return new GraphParameterDto(p.key(), p.value().kind().name(), value);
    }

    private static GraphConnectionDto connectionDto(GraphConnection c) {
        return new GraphConnectionDto(c.id(), c.sourceNodeId(), c.sourcePortId(), c.targetNodeId(),
                c.targetPortId());
    }

    private static GraphGroupDto groupDto(GraphGroup g) {
        return new GraphGroupDto(g.id(), g.name(), g.nodeIds(), g.color());
    }
}
