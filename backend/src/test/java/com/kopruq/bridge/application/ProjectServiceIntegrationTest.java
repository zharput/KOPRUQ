package com.kopruq.bridge.application;

import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.bridge.model.Girder;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.Span;
import com.kopruq.bridge.model.SpanLayout;
import com.kopruq.landxml.application.LandXmlImportRepository;
import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.shared.exception.RevisionConflictException;
import com.kopruq.terrain.application.TerrainRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionOperations;

import java.io.InputStream;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.kopruq.bridge.DesignSystemFixtures.crossSection;
import static com.kopruq.bridge.DesignSystemFixtures.pierFamilies;
import static com.kopruq.bridge.LoadGraphFixtures.graph;
import static com.kopruq.bridge.LoadGraphFixtures.seismic;
import static com.kopruq.bridge.LoadGraphFixtures.trafficLm1;
import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static com.kopruq.bridge.WorkspaceFixtures.workspaceWithEnvironment;
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
    @Autowired
    ProjectContentRepository contents;
    @Autowired
    TerrainRepository terrains;
    @Autowired
    LandXmlImportRepository imports;
    @Autowired
    TransactionOperations transactions;
    @Autowired
    Clock clock;

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

    @Test
    void designSystemPut_keepsWorkspaceBridgeDesignSpaceAndAlternatives_andCountsAsARevision() {
        var layout = new SpanLayout(List.of(new Span(30), new Span(40)));
        BridgeAlternative alt = BridgeAlternative.of(layout, new Girder(5, 1.8, 2.5));
        Project seeded = new Project();
        seeded.setProjectName("seeded-m2");
        seeded.setBridge(new Bridge("VIA", 210, 13.8));
        seeded.setDesignSpace(new DesignSpace(30, 45, 4, 8, 2, 3, 1.5, 2.5, 0.2, 0.3, 1.0, 2.0, 5, 12, 0.1));
        seeded.setGeneratedAlternatives(List.of(alt));
        seeded.setSelectedAlternativeId(alt.id());
        projects.save(seeded);
        service.replace(seeded.getId(), 0, workspace("seeded-m2", row("a")));

        service.replace(seeded.getId(), 1, pierFamilies());
        service.replace(seeded.getId(), 2, crossSection());
        Project after = projects.findById(seeded.getId()).orElseThrow();
        var document = service.document(seeded.getId());

        assertEquals(3, after.getRevision());
        assertEquals("seeded-m2", after.getProjectName());
        assertEquals(seeded.getBridge(), after.getBridge());
        assertEquals(seeded.getDesignSpace(), after.getDesignSpace());
        assertEquals(seeded.getGeneratedAlternatives(), after.getGeneratedAlternatives());
        assertEquals(alt.id(), after.getSelectedAlternativeId());
        assertEquals(List.of("a"), document.workspace().bridges().stream().map(r -> r.id()).toList());
        assertEquals(pierFamilies(), document.content().pierFamilies());
        assertEquals(crossSection().values(), document.content().crossSection());
        assertEquals(null, document.content().bridgeDefinitions());
    }

    @Test
    void designSystemPut_withStaleRevision_isRejectedAndWritesNothing() {
        var created = service.create(workspace("p", row("a")));

        assertThrows(RevisionConflictException.class, () -> service.replace(created.projectId(), 5, pierFamilies()));

        assertEquals(0, jdbc.queryForObject("select count(*) from family_pier where project_id = ?", Integer.class,
                created.projectId()));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_section_presence where project_id = ?",
                Integer.class, created.projectId()));
    }

    @Test
    void loadAndGraphPuts_keepWorkspaceDesignSections_andCountAsRevisions() {
        var created = service.create(workspace("m3", row("a")));
        UUID id = created.projectId();
        service.replace(id, 0, pierFamilies());

        service.replace(id, 1, seismic());
        service.replace(id, 2, trafficLm1());
        service.replace(id, 3, graph("g-1"));
        var document = service.document(id);

        assertEquals(4, document.revision());
        assertEquals(List.of("a"), document.workspace().bridges().stream().map(r -> r.id()).toList());
        assertEquals(pierFamilies(), document.content().pierFamilies());
        assertEquals(seismic().inputs(), document.content().loads().seismic());
        assertEquals(trafficLm1().inputs(), document.content().loads().trafficLm1());
        assertEquals(null, document.content().loads().wind());
        assertEquals(List.of(graph("g-1")), document.content().graphs());
    }

    @Test
    void workspaceAndDesignPuts_keepLoadsAndGraphs() {
        var created = service.create(workspace("m3", row("a")));
        UUID id = created.projectId();
        service.replace(id, 0, seismic());
        service.replace(id, 1, graph("g-1"));

        service.replace(id, 2, workspace("renamed", row("b")));
        service.replace(id, 3, crossSection());
        var document = service.document(id);

        assertEquals(seismic().inputs(), document.content().loads().seismic());
        assertEquals(List.of(graph("g-1")), document.content().graphs());
        assertEquals("renamed", document.workspace().project().name());
        assertEquals(crossSection().values(), document.content().crossSection());
    }

    @Test
    void conflictOnAGraphPut_writesNothing() {
        var created = service.create(workspace("m3", row("a")));

        assertThrows(RevisionConflictException.class, () -> service.replace(created.projectId(), 5, graph("g-1")));

        assertEquals(0, jdbc.queryForObject("select count(*) from graph_document where project_id = ?",
                Integer.class, created.projectId()));
    }

    @Test
    void delete_failingStep_rollsBackTheProjectItsContentAndTheSharedRows() throws Exception {
        LandXmlImportResult stored;
        try (InputStream in = getClass().getResourceAsStream("/landxml/sample.landxml")) {
            stored = new LandXmlImportService().commit(in, "p1", "sample.landxml", "Local", "Existing Ground",
                    "Main Alignment", CoordinateOrder.FIRST_Y_SECOND_X);
        }
        terrains.save(stored.terrain());
        imports.save(stored);
        UUID id = service.create(workspaceWithEnvironment("atomic", stored.terrain().id(), stored.id())).projectId();
        service.replace(id, 0, seismic());
        service.replace(id, 1, graph("g-1"));

        LandXmlImportRepository failingDelete = new LandXmlImportRepository() {
            @Override
            public LandXmlImportResult save(LandXmlImportResult result) {
                return imports.save(result);
            }

            @Override
            public Optional<LandXmlImportResult> findById(String importId) {
                return imports.findById(importId);
            }

            @Override
            public Optional<String> findTerrainId(String importId) {
                return imports.findTerrainId(importId);
            }

            @Override
            public List<String> findIdsByTerrainId(String terrainId) {
                return imports.findIdsByTerrainId(terrainId);
            }

            @Override
            public void deleteById(String importId) {
                throw new IllegalStateException("injected failure");
            }
        };
        ProjectService failing = new ProjectService(projects, contents, terrains, failingDelete, transactions, clock);

        assertThrows(IllegalStateException.class, () -> failing.delete(id));

        assertEquals(1, jdbc.queryForObject("select count(*) from project where id = ?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("select count(*) from project_info where project_id = ?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("select count(*) from load_seismic_input where project_id = ?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("select count(*) from graph_document where project_id = ?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("select count(*) from terrain where id = ?", Integer.class,
                stored.terrain().id()));
        assertEquals(1, jdbc.queryForObject("select count(*) from landxml_import where id = ?", Integer.class,
                stored.id()));

        service.delete(id);

        assertEquals(0, jdbc.queryForObject("select count(*) from terrain where id = ?", Integer.class,
                stored.terrain().id()));
    }
}
