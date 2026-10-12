package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.Span;
import com.kopruq.bridge.model.SpanLayout;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One {@link BridgeAlternative} of a project (child entity with its own id). {@code ordinal} keeps the order of the
 * project's alternative list. Span lengths (metres) are an ordered element collection.
 */
@Entity
@Table(name = "bridge_alternative")
class BridgeAlternativeEntity {

    @Id
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @ElementCollection
    @CollectionTable(name = "bridge_alternative_span", joinColumns = @JoinColumn(name = "alternative_id"))
    @OrderColumn(name = "span_index")
    @Column(name = "length_m", nullable = false)
    private List<Double> spanLengthsM = new ArrayList<>();

    @Embedded
    private GirderEmbeddable girder;
    @Embedded
    private DeckEmbeddable deck;
    @Embedded
    private PierEmbeddable pier;
    @Embedded
    private FoundationEmbeddable foundation;

    protected BridgeAlternativeEntity() {
    }

    BridgeAlternativeEntity(UUID id, ProjectEntity project) {
        this.id = id;
        this.project = project;
    }

    UUID getId() {
        return id;
    }

    void apply(BridgeAlternative a, int ordinal) {
        this.ordinal = ordinal;
        this.spanLengthsM.clear();
        for (Span span : a.spanLayout().spans()) {
            this.spanLengthsM.add(span.lengthM());
        }
        this.girder = GirderEmbeddable.from(a.girder());
        this.deck = a.deck() == null ? null : DeckEmbeddable.from(a.deck());
        this.pier = a.pier() == null ? null : PierEmbeddable.from(a.pier());
        this.foundation = a.foundation() == null ? null : FoundationEmbeddable.from(a.foundation());
    }

    BridgeAlternative toDomain() {
        List<Span> spans = spanLengthsM.stream().map(Span::new).toList();
        return new BridgeAlternative(id, new SpanLayout(spans), girder.toDomain(),
                deck == null ? null : deck.toDomain(),
                pier == null ? null : pier.toDomain(),
                foundation == null ? null : foundation.toDomain());
    }
}
