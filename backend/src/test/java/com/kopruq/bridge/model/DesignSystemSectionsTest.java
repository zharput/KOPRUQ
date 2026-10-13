package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.BridgeAxisType;
import com.kopruq.bridge.enums.PierFamilyType;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static com.kopruq.bridge.DesignSystemFixtures.bridgeDefinitions;
import static com.kopruq.bridge.DesignSystemFixtures.pierFamilies;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Structural invariants of the design-system sections: no engineering rule, range or default is involved. */
class DesignSystemSectionsTest {

    private static PierFamily pier(String id) {
        return new PierFamily(id, null, null, null, null, null, null, null, null);
    }

    private static BridgeDefinition definition(String key, List<AxisFamilyAssignment> assignments) {
        return new BridgeDefinition(key, "b", List.of(), List.of(), "t", null, null, null, null, assignments, null,
                null, "m", "n", List.of());
    }

    private static AxisFamilyAssignment assignment(String axisId) {
        return new AxisFamilyAssignment(axisId, null, null, null, null, null, "", null, null, "", "", "");
    }

    @Test
    void familyCatalog_rejectsBlankDuplicateAndNullIds_butAcceptsAnEmptyCatalog() {
        assertThrows(IllegalArgumentException.class, () -> new PierFamilyCatalog(List.of(pier("a"), pier("a"))));
        assertThrows(IllegalArgumentException.class, () -> new PierFamily(" ", null, null, null, null, null, null,
                null, null));
        assertThrows(IllegalArgumentException.class, () -> new PierFamily(null, null, null, null, null, null, null,
                null, null));
        assertThrows(IllegalArgumentException.class, () -> new PierFamilyCatalog(null));
        assertEquals(List.of(), new PierFamilyCatalog(List.of()).families());
    }

    @Test
    void everyCatalogKind_enforcesUniqueIds() {
        assertThrows(IllegalArgumentException.class, () -> new PierCapFamilyCatalog(List.of(
                new PierCapFamily("a", null, null, null, null, null, null, null, null),
                new PierCapFamily("a", null, null, null, null, null, null, null, null))));
        assertThrows(IllegalArgumentException.class, () -> new FoundationFamilyCatalog(List.of(
                new FoundationFamily("a", null, null, null, null, null, null),
                new FoundationFamily("a", null, null, null, null, null, null))));
        assertThrows(IllegalArgumentException.class, () -> new BearingFamilyCatalog(List.of(
                new BearingFamily("a", null, null, null, null, null, null, null),
                new BearingFamily("a", null, null, null, null, null, null, null))));
        assertThrows(IllegalArgumentException.class, () -> new MaterialAssignmentCatalog(List.of(
                new MaterialAssignment("a", null, null, null), new MaterialAssignment("a", null, null, null))));
    }

    @Test
    void nonFiniteNumbers_areRejectedEverywhere() {
        assertThrows(IllegalArgumentException.class, () -> new RangeRule(Double.NaN, null, null));
        assertThrows(IllegalArgumentException.class, () -> new RangeRule(null, Double.POSITIVE_INFINITY, null));
        assertThrows(IllegalArgumentException.class, () -> new SweepDimension("k", "l", 1, Double.NaN, 1));
        assertThrows(IllegalArgumentException.class, () -> new CrossSectionValues(1, 1, 1, 1, Double.NaN));
        assertThrows(IllegalArgumentException.class, () -> new PreferredSpanRule("i", "t", "v", 1, 1,
                Double.POSITIVE_INFINITY, 1, true, "s"));
        assertThrows(IllegalArgumentException.class, () -> new BridgeAxis("a", "n", BridgeAxisType.PIER,
                Double.NEGATIVE_INFINITY, null, null));
        assertThrows(IllegalArgumentException.class, () -> new MaterialAssignment("a", Double.NaN, null, null));
        assertThrows(IllegalArgumentException.class, () -> new PierFamily.HeightApplicability(null, Double.NaN, null,
                null));
    }

    @Test
    void nullListElements_areRejected_andListsAreCopied() {
        assertThrows(IllegalArgumentException.class, () -> new GirderLibrary(true, Arrays.asList((SweepDimension) null)));
        assertThrows(IllegalArgumentException.class, () -> new BridgeDefinition("k", "b", Arrays.asList(1.0, null),
                List.of(), "t", null, null, null, null, List.of(), null, null, "m", "n", List.of()));
        List<PierFamily> source = new ArrayList<>(List.of(pier("a")));
        PierFamilyCatalog catalog = new PierFamilyCatalog(source);
        source.add(pier("b"));
        assertEquals(1, catalog.families().size());
        assertThrows(UnsupportedOperationException.class, () -> catalog.families().add(pier("c")));
    }

    @Test
    void bridgeDefinitions_requireUniqueNonBlankKeys_andUniqueAxisAssignmentIds() {
        assertThrows(IllegalArgumentException.class, () -> new BridgeDefinitions(List.of(definition("k", List.of()),
                definition("k", List.of()))));
        assertThrows(IllegalArgumentException.class, () -> definition(" ", List.of()));
        assertThrows(IllegalArgumentException.class, () -> definition("k", List.of(assignment("P1"), assignment("P1"))));
        assertThrows(IllegalArgumentException.class, () -> new AxisFamilyAssignment(" ", null, null, null, null, null,
                "", null, null, "", "", ""));
        assertDoesNotThrow(() -> definition("k", List.of(assignment("P1"), assignment("P2"))));
    }

    @Test
    void bridgeDefinition_requiresItsNonNullTextFields() {
        assertThrows(IllegalArgumentException.class, () -> new BridgeDefinition("k", null, List.of(), List.of(), "t",
                null, null, null, null, List.of(), null, null, "m", "n", List.of()));
        assertThrows(IllegalArgumentException.class, () -> new BridgeDefinition("k", "b", List.of(), List.of(), "t",
                null, null, null, null, List.of(), null, null, null, "n", List.of()));
        assertThrows(IllegalArgumentException.class, () -> new AxisFamilyAssignment("P1", null, null, null, null, null,
                null, null, null, "", "", ""));
    }

    @Test
    void duplicateAxisIdsConstraintIdsAndSpanRuleIds_areAccepted() {
        // the frontend does not guarantee these to be unique, so the model does not enforce them
        BridgeDefinitions defs = bridgeDefinitions();
        assertEquals("P1", defs.definitions().get(0).axes().get(1).id());
        assertEquals("P1", defs.definitions().get(0).axes().get(2).id());
        assertEquals("c-1", defs.definitions().get(0).constraints().get(1).id());
        assertDoesNotThrow(() -> com.kopruq.bridge.DesignSystemFixtures.preferredSpanRules());
    }

    @Test
    void nonsensicalButFiniteValues_areAccepted_andStoredUnchanged() {
        RangeRule backwards = new RangeRule(9.0, 1.0, -2.0);
        PreferredSpanRule rule = new PreferredSpanRule("i", "t", "v", 5, -1, 0, -7, true, "");
        assertEquals(9.0, backwards.min());
        assertEquals(1.0, backwards.max());
        assertEquals(-1.0, rule.maxSpan());
        assertEquals(-7.0, rule.primarySpan());
    }

    @Test
    void nullAndEmptyAreDifferent_forOptionalLists() {
        PierFamily bare = pierFamilies().families().get(2);
        PierFamily wall = pierFamilies().families().get(1);
        assertNull(bare.dimensions());
        assertEquals(List.of(), wall.dimensions());
        assertNull(new GirderLibrary(null, null).dimensions());
        assertEquals(List.of(), new GirderLibrary(null, List.of()).dimensions());
        assertNull(new PreferredSpanRulesSection(null).rules());
        assertEquals(List.of(), new PreferredSpanRulesSection(List.of()).rules());
    }

    @Test
    void foundationGeneration_whenPresent_needsAllItsRules() {
        RangeRule r = new RangeRule(null, null, null);
        assertThrows(IllegalArgumentException.class, () -> new FoundationFamily.ShallowGeneration(r, null, r));
        assertThrows(IllegalArgumentException.class, () -> new FoundationFamily.PiledGeneration(r, r, r, r, r, null));
    }

    @Test
    void sweepDimension_needsKeyAndLabel() {
        assertThrows(IllegalArgumentException.class, () -> new SweepDimension(null, "l", 1, 2, 3));
        assertThrows(IllegalArgumentException.class, () -> new SweepDimension("k", null, 1, 2, 3));
    }

    @Test
    void enumLookup_isExactOnTheConstantName() {
        assertEquals(Optional.of(PierFamilyType.H_TYPE), PierFamilyType.fromValue("H_TYPE"));
        assertEquals(Optional.empty(), PierFamilyType.fromValue("h_type"));
        assertEquals(Optional.empty(), PierFamilyType.fromValue(null));
    }
}
