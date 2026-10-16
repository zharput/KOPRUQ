package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.GraphDocument;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Reads and writes the graph documents of a project. A graph is upserted by its id: an existing graph keeps its
 * position (ordinal) and is replaced whole; a new one is appended after the last. No transaction of its own: it runs
 * inside the {@link JpaProjectContentRepository} transaction, which also makes the LAZY child collections readable.
 * Replace is delete, {@code flush}, insert, {@code flush} (Hibernate runs INSERTs before DELETEs, which would
 * violate the UNIQUE constraints on graph, node and connection ids).
 */
@Component
class GraphContentStore {

    private final GraphDocumentJpaRepository graphs;

    GraphContentStore(GraphDocumentJpaRepository graphs) {
        this.graphs = graphs;
    }

    List<GraphDocument> load(UUID projectId) {
        return graphs.findByProjectIdOrderByOrdinalAsc(projectId).stream().map(GraphDocumentEntity::toDomain)
                .toList();
    }

    void deleteAll(UUID projectId) {
        graphs.deleteByProjectId(projectId);
        graphs.flush();
    }

    void replace(UUID projectId, GraphDocument graph) {
        GraphDocumentEntity existing = graphs.findByProjectIdAndGraphId(projectId, graph.id()).orElse(null);
        int ordinal;
        if (existing != null) {
            ordinal = existing.getOrdinal();
            graphs.delete(existing);
            graphs.flush();
        } else {
            ordinal = graphs.maxOrdinal(projectId) + 1;
        }
        graphs.save(new GraphDocumentEntity(projectId, ordinal, graph));
        graphs.flush();
    }
}
