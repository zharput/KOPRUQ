package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.BridgeInventoryRow;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.ProjectWorkspace;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static com.kopruq.bridge.WorkspaceFixtures.info;
import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.rowWithoutDepths;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaProjectRepository.class, JpaProjectContentRepository.class, DesignSystemContentStore.class})
class JpaProjectContentRepositoryTest {

    @Autowired
    JpaProjectRepository projects;
    @Autowired
    JpaProjectContentRepository contents;
    @Autowired
    EntityManager em;
    @Autowired
    JdbcTemplate jdbc;

    private Project newProject(String name) {
        Project project = new Project();
        project.setProjectName(name);
        projects.save(project);
        return project;
    }

    private ProjectWorkspace replaceAndReload(Project project, ProjectWorkspace ws) {
        contents.replace(project.getId(), ws);
        em.flush();
        em.clear();
        return contents.load(project.getId()).workspace();
    }

    @Test
    void projectWithoutInfoRow_loadsNullWorkspace() {
        Project project = newProject("legacy");

        assertNull(contents.load(project.getId()).workspace());
    }

    @Test
    void workspace_roundTripsEqual_includingNullDepthsEmptySpansUnicodeAndNullEnvironment() {
        Project project = newProject("Koridor Ç");
        ProjectWorkspace ws = workspace("Koridor Ç", row("b-1"), rowWithoutDepths("b-2"),
                new BridgeInventoryRow("b-3", "n", "k", "c", 1.5, 2.5, "t", "s",
                        com.kopruq.bridge.enums.BridgeInventoryType.STEEL_COMPOSITE_GIRDER, List.of(10.0),
                        List.of(), null, com.kopruq.bridge.enums.InventoryPierShape.RECTANGULAR));

        ProjectWorkspace loaded = replaceAndReload(project, ws);

        assertEquals(ws, loaded);
        assertNull(loaded.bridges().get(1).girderDepthCm());
        assertEquals(List.of(), loaded.bridges().get(1).spansM());
        assertEquals(List.of(), loaded.bridges().get(2).girderDepthCm());
        assertNull(loaded.project().environment().terrainDatasetId());
    }

    @Test
    void name_isStoredOnlyOnTheProjectRow() {
        Project project = newProject("the-name");

        ProjectWorkspace loaded = replaceAndReload(project, workspace("the-name", row("b-1")));

        assertEquals("the-name", loaded.project().name());
        assertEquals("PRJ-01", jdbc.queryForObject("select project_code from project_info where project_id = ?",
                String.class, project.getId()));
    }

    @Test
    void replace_reordersAddsRemovesAndSwapsRowsWithSameIds_withoutUniqueViolations() {
        Project project = newProject("p");
        replaceAndReload(project, workspace("p", row("a"), row("b"), row("c")));

        ProjectWorkspace next = workspace("p", row("c"), row("a"), row("d"));
        ProjectWorkspace loaded = replaceAndReload(project, next);

        assertEquals(next, loaded);
        assertEquals(3, jdbc.queryForObject("select count(*) from project_bridge_row where project_id = ?",
                Integer.class, project.getId()));

        ProjectWorkspace empty = workspace("p");
        assertEquals(empty, replaceAndReload(project, empty));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_bridge_row where project_id = ?",
                Integer.class, project.getId()));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_bridge_row_span", Integer.class)
                - jdbc.queryForObject("select count(*) from project_bridge_row_span s join project_bridge_row r on r.id = s.bridge_row_id where r.project_id <> ?",
                        Integer.class, project.getId()));
    }

    @Test
    void replace_overwritesTheInfoRow_inPlace() {
        Project project = newProject("p");
        replaceAndReload(project, workspace("p"));
        ProjectWorkspace changed = new ProjectWorkspace(
                new com.kopruq.bridge.model.ProjectInfo("p", "CODE-2", "x", "x", "x", "x", "x", "x", "x", "x", "x",
                        "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", info("p").units(), info("p").coordinate(),
                        info("p").criteria(),
                        new com.kopruq.bridge.model.ProjectInfo.Environment("terrain-1", "landxml-1"), "later"),
                List.of());

        assertEquals(changed, replaceAndReload(project, changed));
        assertEquals(1, jdbc.queryForObject("select count(*) from project_info where project_id = ?",
                Integer.class, project.getId()));
    }
}
