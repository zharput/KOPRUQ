package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.DesignSystemFixtures;
import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.FoundationFamily;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamily;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.Project;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.RangeRule;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static com.kopruq.bridge.DesignSystemFixtures.bearingFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.bridgeDefinitions;
import static com.kopruq.bridge.DesignSystemFixtures.crossSection;
import static com.kopruq.bridge.DesignSystemFixtures.foundationFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.girderLibrary;
import static com.kopruq.bridge.DesignSystemFixtures.materialAssignments;
import static com.kopruq.bridge.DesignSystemFixtures.pierCapFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.pierFamilies;
import static com.kopruq.bridge.DesignSystemFixtures.preferredSpanRules;
import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/** The M2 sections through the real adapter on the migrated test database (Flyway + {@code ddl-auto=validate}). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaProjectRepository.class, JpaProjectContentRepository.class, DesignSystemContentStore.class,
        LoadInputContentStore.class, GraphContentStore.class})
class JpaDesignSystemContentTest {

    @Autowired
    JpaProjectRepository projects;
    @Autowired
    JpaProjectContentRepository contents;
    @Autowired
    EntityManager em;
    @Autowired
    JdbcTemplate jdbc;

    private UUID newProject() {
        Project project = new Project();
        project.setProjectName("p");
        projects.save(project);
        return project.getId();
    }

    private ProjectContent replaceAndReload(UUID id, ProjectSection section) {
        contents.replace(id, section);
        em.flush();
        em.clear();
        return contents.load(id);
    }

    private int count(String table, UUID id) {
        return jdbc.queryForObject("select count(*) from " + table + " where project_id = ?", Integer.class, id);
    }

    private int childCount(String table, String fk, String parent, UUID id) {
        return jdbc.queryForObject("select count(*) from " + table + " c join " + parent + " p on p.id = c." + fk
                + " where p.project_id = ?", Integer.class, id);
    }

    /** The part of the loaded content that the given section stores. */
    private static Object stored(ProjectContent c, ProjectSection section) {
        return switch (section) {
            case BridgeDefinitions s -> c.bridgeDefinitions();
            case PierFamilyCatalog s -> c.pierFamilies();
            case PierCapFamilyCatalog s -> c.pierCapFamilies();
            case FoundationFamilyCatalog s -> c.foundationFamilies();
            case BearingFamilyCatalog s -> c.bearingFamilies();
            case MaterialAssignmentCatalog s -> c.materialAssignments();
            case GirderLibrarySection s -> new GirderLibrarySection(c.girderLibrary());
            case PreferredSpanRulesSection s -> new PreferredSpanRulesSection(c.preferredSpanRules());
            case CrossSectionSection s -> new CrossSectionSection(c.crossSection());
            default -> throw new IllegalArgumentException();
        };
    }

    static Stream<ProjectSection> allSections() {
        return Stream.of(bridgeDefinitions(), pierFamilies(), pierCapFamilies(), foundationFamilies(),
                bearingFamilies(), materialAssignments(), girderLibrary(), preferredSpanRules(), crossSection());
    }

    @ParameterizedTest
    @MethodSource("allSections")
    void section_roundTripsEqual(ProjectSection section) {
        UUID id = newProject();

        ProjectContent loaded = replaceAndReload(id, section);

        assertEquals(section, stored(loaded, section));
    }

    @Test
    void projectWithNothingStored_loadsEveryDesignSectionNull() {
        UUID id = newProject();

        ProjectContent c = contents.load(id);

        assertNull(c.workspace());
        assertNull(c.bridgeDefinitions());
        assertNull(c.pierFamilies());
        assertNull(c.pierCapFamilies());
        assertNull(c.foundationFamilies());
        assertNull(c.bearingFamilies());
        assertNull(c.materialAssignments());
        assertNull(c.girderLibrary());
        assertNull(c.preferredSpanRules());
        assertNull(c.crossSection());
    }

    @Test
    void designSections_loadWithoutAWorkspace_andNextToOne() {
        UUID id = newProject();
        replaceAndReload(id, pierFamilies());
        assertNull(contents.load(id).workspace());
        assertEquals(pierFamilies(), contents.load(id).pierFamilies());

        contents.replace(id, workspace("p", row("a")));
        em.flush();
        em.clear();
        ProjectContent c = contents.load(id);
        assertNotNull(c.workspace());
        assertEquals(pierFamilies(), c.pierFamilies());
    }

    @Test
    void writtenEmptyLists_readBackEmpty_notNull() {
        UUID id = newProject();
        replaceAndReload(id, new BridgeDefinitions(List.of()));
        replaceAndReload(id, new PierFamilyCatalog(List.of()));
        replaceAndReload(id, new PierCapFamilyCatalog(List.of()));
        replaceAndReload(id, new FoundationFamilyCatalog(List.of()));
        replaceAndReload(id, new BearingFamilyCatalog(List.of()));
        replaceAndReload(id, new MaterialAssignmentCatalog(List.of()));
        ProjectContent c = replaceAndReload(id, new PreferredSpanRulesSection(List.of()));

        assertEquals(List.of(), c.bridgeDefinitions().definitions());
        assertEquals(List.of(), c.pierFamilies().families());
        assertEquals(List.of(), c.pierCapFamilies().families());
        assertEquals(List.of(), c.foundationFamilies().families());
        assertEquals(List.of(), c.bearingFamilies().families());
        assertEquals(List.of(), c.materialAssignments().assignments());
        assertEquals(List.of(), c.preferredSpanRules());
        assertEquals(7, count("project_section_presence", id));
    }

    @Test
    void clearing_removesPreferredSpanRulesGirderLibraryAndCrossSection() {
        UUID id = newProject();
        replaceAndReload(id, preferredSpanRules());
        replaceAndReload(id, girderLibrary());
        replaceAndReload(id, crossSection());
        assertEquals(2, count("preferred_span_rule", id));
        assertEquals(1, count("girder_library", id));
        assertEquals(1, count("cross_section", id));

        replaceAndReload(id, new PreferredSpanRulesSection(null));
        replaceAndReload(id, new GirderLibrarySection(null));
        ProjectContent c = replaceAndReload(id, new CrossSectionSection(null));

        assertNull(c.preferredSpanRules());
        assertNull(c.girderLibrary());
        assertNull(c.crossSection());
        assertEquals(0, count("preferred_span_rule", id));
        assertEquals(0, count("girder_library", id));
        assertEquals(0, count("cross_section", id));
        assertEquals(0, count("project_section_presence", id));
    }

    @Test
    void girderLibrary_nullFieldsAndEmptyDimensions_stayDistinct() {
        UUID id = newProject();

        GirderLibrary allNull = replaceAndReload(id, new GirderLibrarySection(new GirderLibrary(null, null)))
                .girderLibrary();
        assertNotNull(allNull);
        assertNull(allNull.enabled());
        assertNull(allNull.dimensions());

        GirderLibrary empty = replaceAndReload(id, new GirderLibrarySection(new GirderLibrary(false, List.of())))
                .girderLibrary();
        assertEquals(false, empty.enabled());
        assertEquals(List.of(), empty.dimensions());
        assertEquals(0, jdbc.queryForObject("select count(*) from girder_library_dimension where project_id = ?",
                Integer.class, id));
    }

    @Test
    void rules_allNullIsAnObject_absentIsNull_andOptionalListsKeepNullVersusEmpty() {
        UUID id = newProject();
        ProjectContent c = replaceAndReload(id, pierCapFamilies());
        assertEquals(new RangeRule(null, null, null), c.pierCapFamilies().families().get(1).capTransverseLength());
        assertNull(c.pierCapFamilies().families().get(1).stemWidth());

        c = replaceAndReload(id, pierFamilies());
        assertNull(c.pierFamilies().families().get(2).dimensions());
        assertNull(c.pierFamilies().families().get(2).allowedConfigurations());
        assertEquals(List.of(), c.pierFamilies().families().get(1).dimensions());
        assertEquals(List.of(), c.pierFamilies().families().get(1).allowedConfigurations());
        assertEquals(new PierFamily.HeightApplicability(null, null, null, null),
                c.pierFamilies().families().get(1).heightApplicability());
        assertNull(c.pierFamilies().families().get(2).heightApplicability());

        c = replaceAndReload(id, foundationFamilies());
        FoundationFamily piled = c.foundationFamilies().families().get(0);
        assertNull(piled.shallowGeneration());
        assertEquals(new RangeRule(null, null, null), piled.piledGeneration().height());
        assertNull(c.foundationFamilies().families().get(3).piledGeneration());
    }

    @Test
    void replace_reordersAddsRemovesAndSwapsRowsWithSameIds_andDeletesChildRows() {
        UUID id = newProject();
        replaceAndReload(id, bridgeDefinitions());
        assertEquals(2, count("bridge_definition", id));
        assertEquals(3, childCount("bridge_definition_axis", "bridge_definition_id", "bridge_definition", id));
        assertEquals(3, childCount("bridge_definition_span", "bridge_definition_id", "bridge_definition", id));

        BridgeDefinitions original = bridgeDefinitions();
        BridgeDefinitions swapped = new BridgeDefinitions(List.of(original.definitions().get(1),
                original.definitions().get(0)));
        assertEquals(swapped, replaceAndReload(id, swapped).bridgeDefinitions());

        BridgeDefinitions onlyMinimal = new BridgeDefinitions(List.of(original.definitions().get(1)));
        assertEquals(onlyMinimal, replaceAndReload(id, onlyMinimal).bridgeDefinitions());
        assertEquals(1, count("bridge_definition", id));
        assertEquals(0, childCount("bridge_definition_axis", "bridge_definition_id", "bridge_definition", id));
        assertEquals(0, childCount("bridge_definition_axis_assignment", "bridge_definition_id", "bridge_definition", id));
        assertEquals(0, childCount("bridge_definition_constraint", "bridge_definition_id", "bridge_definition", id));
        assertEquals(0, childCount("bridge_definition_span", "bridge_definition_id", "bridge_definition", id));
    }

    @Test
    void families_replaceWithSameIdsInAnotherOrder_withoutUniqueViolations() {
        UUID id = newProject();
        PierFamilyCatalog first = pierFamilies();
        replaceAndReload(id, first);
        assertEquals(1, childCount("family_pier_configuration", "pier_family_id", "family_pier", id) > 0 ? 1 : 0);

        PierFamilyCatalog reordered = new PierFamilyCatalog(List.of(first.families().get(2), first.families().get(0)));
        assertEquals(reordered, replaceAndReload(id, reordered).pierFamilies());
        assertEquals(2, count("family_pier", id));
        assertEquals(3, childCount("family_pier_configuration", "pier_family_id", "family_pier", id));

        FoundationFamilyCatalog f = foundationFamilies();
        replaceAndReload(id, f);
        FoundationFamilyCatalog reversed = new FoundationFamilyCatalog(List.of(f.families().get(3),
                f.families().get(2), f.families().get(1), f.families().get(0)));
        assertEquals(reversed, replaceAndReload(id, reversed).foundationFamilies());
    }

    @Test
    void writingOneSection_leavesTheOthersUntouched() {
        UUID id = newProject();
        allSections().forEach(s -> contents.replace(id, s));
        em.flush();
        em.clear();
        ProjectContent before = contents.load(id);

        ProjectContent after = replaceAndReload(id, new PierFamilyCatalog(List.of()));

        assertEquals(List.of(), after.pierFamilies().families());
        assertEquals(before.bridgeDefinitions(), after.bridgeDefinitions());
        assertEquals(before.pierCapFamilies(), after.pierCapFamilies());
        assertEquals(before.foundationFamilies(), after.foundationFamilies());
        assertEquals(before.bearingFamilies(), after.bearingFamilies());
        assertEquals(before.materialAssignments(), after.materialAssignments());
        assertEquals(before.girderLibrary(), after.girderLibrary());
        assertEquals(before.preferredSpanRules(), after.preferredSpanRules());
        assertEquals(before.crossSection(), after.crossSection());
        assertEquals(0, count("family_pier", id));
        assertEquals(0, childCount("family_pier_dimension", "pier_family_id", "family_pier", id));
    }

    @Test
    void awkwardDoubles_roundTripBitForBit() {
        UUID id = newProject();

        ProjectContent c = replaceAndReload(id, crossSection());

        assertEquals(Double.doubleToLongBits(DesignSystemFixtures.AWKWARD),
                Double.doubleToLongBits(c.crossSection().spaceOfGirderM()));
    }

    @Test
    void preferredSpanRules_keepDuplicateIdsAndOrder() {
        UUID id = newProject();

        ProjectContent c = replaceAndReload(id, preferredSpanRules());

        assertEquals(2, c.preferredSpanRules().size());
        assertEquals("girder-span-PG-H160", c.preferredSpanRules().get(1).id());
        assertEquals("other ç", c.preferredSpanRules().get(1).superstructureType());
    }
}
