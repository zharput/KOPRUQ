package com.kopruq.bridge.application;

import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.bridge.model.Girder;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.Span;
import com.kopruq.bridge.model.SpanLayout;
import com.kopruq.shared.exception.RevisionConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** The service on the real beans and database: workspace writes must not disturb the rest of the Project aggregate. */
@SpringBootTest
class ProjectServiceIntegrationTest {

    @Autowired
    ProjectService service;
    @Autowired
    ProjectRepository projects;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void workspacePut_keepsBridgeDesignSpaceAlternativesAndSelection() {
        var layout = new SpanLayout(List.of(new Span(30), new Span(40)));
        BridgeAlternative alt1 = BridgeAlternative.of(layout, new Girder(5, 1.8, 2.5));
        BridgeAlternative alt2 = BridgeAlternative.of(new SpanLayout(List.of(new Span(70))), new Girder(4, 1.5, 3.0));
        Project seeded = new Project();
        seeded.setProjectName("seeded");
        seeded.setBridge(new Bridge("VIA", 210, 13.8));
        seeded.setDesignSpace(new DesignSpace(30, 45, 4, 8, 2, 3, 1.5, 2.5, 0.2, 0.3, 1.0, 2.0, 5, 12, 0.1));
        seeded.setGeneratedAlternatives(List.of(alt1, alt2));
        seeded.setSelectedAlternativeId(alt2.id());
        projects.save(seeded);
        var created = service.create(workspace("seeded", row("a")));
        // the seeded aggregate has its own id; put its workspace through the service as well
        service.replace(seeded.getId(), 0, workspace("seeded", row("a")));
        service.replace(seeded.getId(), 1, workspace("renamed", row("b"), row("a")));

        Project after = projects.findById(seeded.getId()).orElseThrow();

        assertEquals(2, after.getRevision());
        assertEquals("renamed", after.getProjectName());
        assertEquals(seeded.getBridge(), after.getBridge());
        assertEquals(seeded.getDesignSpace(), after.getDesignSpace());
        assertEquals(seeded.getGeneratedAlternatives(), after.getGeneratedAlternatives());
        assertEquals(alt2.id(), after.getSelectedAlternativeId());
        assertEquals(List.of("b", "a"), service.document(seeded.getId()).workspace().bridges().stream()
                .map(r -> r.id()).toList());
        assertEquals(0, created.revision());
    }

    @Test
    void conflict_rollsBackAndLeavesTheStoredStateAlone() {
        var created = service.create(workspace("p", row("a")));
        service.replace(created.projectId(), 0, workspace("p2", row("a"), row("b")));
        long before = jdbc.queryForObject("select revision from project where id = ?", Long.class, created.projectId());

        assertThrows(RevisionConflictException.class,
                () -> service.replace(created.projectId(), 0, workspace("p3", row("z"))));

        assertEquals(before, jdbc.queryForObject("select revision from project where id = ?", Long.class, created.projectId()));
        assertEquals("p2", jdbc.queryForObject("select project_name from project where id = ?", String.class, created.projectId()));
        assertEquals(2, jdbc.queryForObject("select count(*) from project_bridge_row where project_id = ?",
                Integer.class, created.projectId()));
    }

    @Test
    void list_containsCreatedProjectWithItsRevision() {
        var created = service.create(workspace("listed"));
        UUID id = created.projectId();

        var summary = service.list().stream().filter(s -> s.projectId().equals(id)).findFirst().orElseThrow();

        assertEquals("listed", summary.name());
        assertEquals(0, summary.revision());
    }
}
