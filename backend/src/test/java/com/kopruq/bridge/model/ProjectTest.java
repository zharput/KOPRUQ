package com.kopruq.bridge.model;

import com.kopruq.shared.exception.RevisionConflictException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectTest {

    private static BridgeAlternative makeAlternative() {
        var layout = new SpanLayout(List.of(new Span(40)));
        var girder = new Girder(6, 2.1, 2.3);
        return BridgeAlternative.of(layout, girder);
    }

    @Test
    void selectedAlternative_emptyWhenNoSelectionMade() {
        var project = new Project();

        assertTrue(project.getSelectedAlternative().isEmpty());
    }

    @Test
    void selectedAlternative_returnsMatchingAlternativeById() {
        var alt = makeAlternative();
        var project = new Project();
        project.setGeneratedAlternatives(List.of(alt));
        project.setSelectedAlternativeId(alt.id());

        assertSame(alt, project.getSelectedAlternative().orElseThrow());
    }

    @Test
    void selectedAlternative_emptyWhenIdDoesNotMatchAnyGeneratedAlternative() {
        var alt = makeAlternative();
        var project = new Project();
        project.setGeneratedAlternatives(List.of(alt));
        project.setSelectedAlternativeId(UUID.randomUUID());

        assertTrue(project.getSelectedAlternative().isEmpty());
    }

    @Test
    void setGeneratedAlternatives_replacesPreviousContent() {
        var project = new Project();
        project.setGeneratedAlternatives(List.of(makeAlternative(), makeAlternative()));

        project.setGeneratedAlternatives(List.of(makeAlternative()));

        assertEquals(1, project.getGeneratedAlternatives().size());
    }

    @Test
    void newProject_startsAtRevisionZero_withUpdatedEqualToCreated() {
        var project = new Project();

        assertEquals(0, project.getRevision());
        assertEquals(project.getCreatedUtc(), project.getUpdatedUtc());
    }

    @Test
    void recordChange_raisesRevisionByOne_andSetsUpdatedTime() {
        var project = new Project();
        var later = Instant.parse("2030-01-01T00:00:00Z");

        project.recordChange(later);

        assertEquals(1, project.getRevision());
        assertEquals(later, project.getUpdatedUtc());
        project.recordChange(later.plusSeconds(1));
        assertEquals(2, project.getRevision());
    }

    @Test
    void requireRevision_passesOnMatch_andThrowsConflictOtherwise() {
        var project = new Project();
        project.restoreRevision(5, Instant.parse("2030-01-01T00:00:00Z"));

        project.requireRevision(5);
        var e = assertThrows(RevisionConflictException.class, () -> project.requireRevision(3));
        assertEquals(3, e.expectedRevision());
        assertEquals(5, e.currentRevision());
        assertEquals(5, project.getRevision(), "a rejected check changes nothing");
    }

    @Test
    void restoreRevision_rejectsNegativeRevisionAndMissingTime() {
        var project = new Project();

        assertThrows(IllegalArgumentException.class, () -> project.restoreRevision(-1, Instant.now()));
        assertThrows(IllegalArgumentException.class, () -> project.restoreRevision(0, null));
    }
}
