package com.spanova.bridgecore;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
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
}
