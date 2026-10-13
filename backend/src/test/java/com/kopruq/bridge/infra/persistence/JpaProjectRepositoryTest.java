package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.FoundationType;
import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.Deck;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.bridge.model.Foundation;
import com.kopruq.bridge.model.Girder;
import com.kopruq.bridge.model.Pier;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.Span;
import com.kopruq.bridge.model.SpanLayout;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(JpaProjectRepository.class)
class JpaProjectRepositoryTest {

    @Autowired
    JpaProjectRepository repository;
    @Autowired
    EntityManager em;
    @Autowired
    JdbcTemplate jdbc;

    private static SpanLayout spans(double... lengths) {
        List<Span> list = new ArrayList<>();
        for (double l : lengths) {
            list.add(new Span(l));
        }
        return new SpanLayout(list);
    }

    private static BridgeAlternative full(double... spanLengths) {
        return new BridgeAlternative(UUID.randomUUID(), spans(spanLengths), new Girder(5, 1.8, 2.5), new Deck(0.25),
                new Pier(1.2, 8.5, "some-free-text-type"), new Foundation(FoundationType.PILE, 6, 0.9));
    }

    private static DesignSpace designSpace() {
        return new DesignSpace(30, 45, 4, 8, 2, 3, 1.5, 2.5, 0.2, 0.3, 1.0, 2.0, 5, 12, 0.1);
    }

    private Project saveAndReload(Project project) {
        repository.save(project);
        em.flush();
        em.clear();
        return repository.findById(project.getId()).orElseThrow();
    }

    /** The timestamp column keeps microseconds; compare the rest exactly. */
    private static void assertSameProject(Project expected, Project actual) {
        assertEquals(expected.getId(), actual.getId());
        assertEquals(expected.getProjectName(), actual.getProjectName());
        assertEquals(expected.getCreatedUtc().truncatedTo(ChronoUnit.MICROS), actual.getCreatedUtc().truncatedTo(ChronoUnit.MICROS));
        assertEquals(expected.getRevision(), actual.getRevision());
        assertEquals(expected.getUpdatedUtc().truncatedTo(ChronoUnit.MICROS), actual.getUpdatedUtc().truncatedTo(ChronoUnit.MICROS));
        assertEquals(expected.getBridge(), actual.getBridge());
        assertEquals(expected.getDesignSpace(), actual.getDesignSpace());
        assertEquals(expected.getGeneratedAlternatives(), actual.getGeneratedAlternatives());
        assertEquals(expected.getSelectedAlternativeId(), actual.getSelectedAlternativeId());
    }

    @Test
    void fullProject_roundTripsEqual_withMixedNullDeckPierFoundation() {
        Project project = new Project();
        project.setProjectName("VIA-35");
        project.setCreatedUtc(Instant.parse("2026-01-02T03:04:05.123456789Z"));
        project.setBridge(new Bridge("VIA-35", 210, 13.8));
        project.setDesignSpace(designSpace());
        BridgeAlternative a0 = full(30, 40, 35.5, 30);
        BridgeAlternative a1 = BridgeAlternative.of(spans(70, 70), new Girder(6, 2.0, 2.2));
        BridgeAlternative a2 = new BridgeAlternative(UUID.randomUUID(), spans(105), new Girder(4, 1.5, 3.0), new Deck(0.22),
                null, new Foundation(FoundationType.SPREAD, null, null));
        BridgeAlternative a3 = new BridgeAlternative(UUID.randomUUID(), spans(50, 50), new Girder(4, 1.5, 3.0), null,
                new Pier(2.0, 9.0, null), null);
        project.setGeneratedAlternatives(List.of(a0, a1, a2, a3));
        project.setSelectedAlternativeId(a2.id());

        Project loaded = saveAndReload(project);

        assertSameProject(project, loaded);
        assertEquals(a2, loaded.getSelectedAlternative().orElseThrow());
        assertEquals(List.of(30.0, 40.0, 35.5, 30.0), loaded.getGeneratedAlternatives().get(0).spanLayout().spans()
                .stream().map(Span::lengthM).toList(), "span order is kept");
        assertNull(loaded.getGeneratedAlternatives().get(1).deck());
        assertNull(loaded.getGeneratedAlternatives().get(1).pier());
        assertNull(loaded.getGeneratedAlternatives().get(1).foundation());
    }

    @Test
    void projectWithoutBridgeDesignSpaceOrAlternatives_roundTripsWithNulls() {
        Project project = new Project();
        project.setProjectName("");

        Project loaded = saveAndReload(project);

        assertNull(loaded.getBridge());
        assertNull(loaded.getDesignSpace());
        assertTrue(loaded.getGeneratedAlternatives().isEmpty());
        assertNull(loaded.getSelectedAlternativeId());
        assertSameProject(project, loaded);
    }

    @Test
    void unknownId_isEmpty() {
        assertTrue(repository.findById(UUID.randomUUID()).isEmpty());
    }

    @Test
    void secondSave_removesAddsAndReordersAlternatives_withoutPrimaryKeyErrors() {
        Project project = new Project();
        project.setProjectName("p");
        project.setBridge(new Bridge("b", 100, 10));
        project.setDesignSpace(designSpace());
        BridgeAlternative a = full(20, 30);
        BridgeAlternative b = full(25, 25);
        BridgeAlternative c = full(50);
        project.setGeneratedAlternatives(List.of(a, b, c));
        project.setSelectedAlternativeId(b.id());
        saveAndReload(project);

        // remove b, keep a and c in a swapped order with changed content, add d and e
        BridgeAlternative cChanged = new BridgeAlternative(c.id(), spans(10, 20, 20), new Girder(7, 2.1, 1.9), null, null, null);
        BridgeAlternative aChanged = new BridgeAlternative(a.id(), spans(100), a.girder(), a.deck(), a.pier(), a.foundation());
        BridgeAlternative d = full(33);
        BridgeAlternative e = BridgeAlternative.of(spans(40, 40), new Girder(3, 1.0, 1.0));
        Project edited = new Project();
        edited.setId(project.getId());
        edited.setProjectName("renamed");
        edited.setCreatedUtc(project.getCreatedUtc());
        edited.setBridge(new Bridge("b2", 120, 11));
        edited.setDesignSpace(null);
        edited.setGeneratedAlternatives(List.of(cChanged, d, aChanged, e));
        edited.setSelectedAlternativeId(null);

        Project loaded = saveAndReload(edited);

        assertSameProject(edited, loaded);
        assertEquals(List.of(cChanged.id(), d.id(), aChanged.id(), e.id()),
                loaded.getGeneratedAlternatives().stream().map(BridgeAlternative::id).toList());
        assertEquals(1, jdbc.queryForObject("select count(*) from project where id = ?", Integer.class, project.getId()));
        assertEquals(4, jdbc.queryForObject("select count(*) from bridge_alternative where project_id = ?", Integer.class, project.getId()));
        assertEquals(0, jdbc.queryForObject("select count(*) from bridge_alternative where id = ?", Integer.class, b.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from bridge_alternative_span where alternative_id = ?", Integer.class, b.id()));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_design_space where project_id = ?", Integer.class, project.getId()));
    }

    @Test
    void saveTwice_withTheSameState_isStable() {
        Project project = new Project();
        project.setBridge(new Bridge("b", 1, 1));
        project.setGeneratedAlternatives(List.of(full(10, 10)));
        saveAndReload(project);
        Project loaded = saveAndReload(project);
        assertSameProject(project, loaded);
    }

    @Test
    void revisionAndUpdatedTime_roundTrip() {
        Project project = new Project();
        project.setProjectName("rev");
        project.restoreRevision(7, Instant.parse("2031-02-03T04:05:06.123456789Z"));

        Project loaded = saveAndReload(project);

        assertEquals(7, loaded.getRevision());
        assertEquals(Instant.parse("2031-02-03T04:05:06.123456Z"), loaded.getUpdatedUtc());
        assertSameProject(project, loaded);
    }

    @Test
    void findByIdForUpdate_returnsTheStoredProject_orEmpty() {
        Project project = new Project();
        project.setProjectName("lock");
        repository.save(project);
        em.flush();
        em.clear();

        assertEquals(project.getId(), repository.findByIdForUpdate(project.getId()).orElseThrow().getId());
        assertTrue(repository.findByIdForUpdate(UUID.randomUUID()).isEmpty());
    }

    @Test
    void findSummaries_listsNameRevisionAndTimes() {
        Project project = new Project();
        project.setProjectName("summary");
        project.restoreRevision(2, Instant.parse("2031-01-01T00:00:00Z"));
        repository.save(project);
        em.flush();
        em.clear();

        var summary = repository.findSummaries().stream()
                .filter(s -> s.projectId().equals(project.getId())).findFirst().orElseThrow();

        assertEquals("summary", summary.name());
        assertEquals(2, summary.revision());
        assertEquals(Instant.parse("2031-01-01T00:00:00Z"), summary.updatedUtc());
        assertEquals(project.getCreatedUtc().truncatedTo(ChronoUnit.MICROS), summary.createdUtc());
    }
}
