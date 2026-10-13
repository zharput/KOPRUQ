package com.kopruq.bridge;

import com.kopruq.bridge.enums.BearingFamilyType;
import com.kopruq.bridge.enums.BridgeAxisType;
import com.kopruq.bridge.enums.ConstraintKind;
import com.kopruq.bridge.enums.FoundationFamilyType;
import com.kopruq.bridge.enums.PierCapConfiguration;
import com.kopruq.bridge.enums.PierCapType;
import com.kopruq.bridge.enums.PierFamilyType;
import com.kopruq.bridge.model.AxisFamilyAssignment;
import com.kopruq.bridge.model.BearingFamily;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeAxis;
import com.kopruq.bridge.model.BridgeConstraint;
import com.kopruq.bridge.model.BridgeDefinition;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.CrossSectionValues;
import com.kopruq.bridge.model.FoundationFamily;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.MaterialAssignment;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamily;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamily;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRule;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.RangeRule;
import com.kopruq.bridge.model.SweepDimension;

import java.util.List;

/**
 * Design-system test data. The values are arbitrary test numbers and strings (including negative, zero, min > max
 * and non-round doubles on purpose), not engineering data.
 */
public final class DesignSystemFixtures {

    public static final double AWKWARD = 0.30000000000000004;

    private DesignSystemFixtures() {
    }

    public static RangeRule rule(double min, double max, double delta) {
        return new RangeRule(min, max, delta);
    }

    public static SweepDimension dimension(String key) {
        return new SweepDimension(key, "Çap (" + key + ")", 3.0, AWKWARD, -1.0);
    }

    // ------------------------------------------------------------------ bridge definitions

    public static BridgeDefinitions bridgeDefinitions() {
        BridgeDefinition full = new BridgeDefinition("key-1", "other-bridge-id", List.of(30.0, AWKWARD, 0.0),
                List.of(new BridgeAxis("A1", "Kenar ayak ç", BridgeAxisType.ABUTMENT, 0.0, null, null),
                        new BridgeAxis("P1", "P1", BridgeAxisType.PIER, 30.0, 12.5, -5.5),
                        new BridgeAxis("P1", "duplicate axis id is allowed", BridgeAxisType.PIER, -4.0, 0.0, 0.0)),
                "Precast Girder", "G-FAM", "PG-H160", 5.0, 13.8,
                List.of(new AxisFamilyAssignment("P1", "RECT-M", 12.5, "CAP-1", "F-1", -3.0, "soil ü", "B-1", 2.0,
                        "orient", "long", "trans"),
                        new AxisFamilyAssignment("A1", null, null, null, null, null, "", null, null, "", "", "")),
                "AB-1", null, "cast-in-place", "stages çğ",
                List.of(new BridgeConstraint("c-1", ConstraintKind.RIVER, "river", 10.0, 5.0, "note"),
                        new BridgeConstraint("c-1", ConstraintKind.OTHER, "", null, null, "")));
        BridgeDefinition minimal = new BridgeDefinition("key-2", "", List.of(), List.of(), "", null, null, null, null,
                List.of(), null, null, "", "", List.of());
        return new BridgeDefinitions(List.of(full, minimal));
    }

    // ------------------------------------------------------------------ families

    public static PierFamilyCatalog pierFamilies() {
        PierFamily full = new PierFamily("RECT-M", "Dikdörtgen", PierFamilyType.H_TYPE, false,
                List.of(dimension("B"), dimension("H")), List.of("SINGLE_COLUMN", "TWO_COLUMNS", "free text"),
                dimension("spacing"), new PierFamily.HeightApplicability(1.0, null, 3.0, 2.0), "PROJECT");
        PierFamily wall = new PierFamily("WALL-1", "Wall", PierFamilyType.WALL, true, List.of(), List.of(), null,
                new PierFamily.HeightApplicability(null, null, null, null), "");
        PierFamily bare = new PierFamily("BARE", null, null, null, null, null, null, null, null);
        return new PierFamilyCatalog(List.of(full, wall, bare));
    }

    public static PierCapFamilyCatalog pierCapFamilies() {
        PierCapFamily full = new PierCapFamily("CAP-1", "Cap ş", PierCapType.T_CAP, PierCapConfiguration.TWO_COLUMNS,
                rule(9.0, 1.0, 0.0), rule(1.0, 2.0, AWKWARD), rule(-1.0, 0.0, 1.0), true, "src");
        PierCapFamily emptyRules = new PierCapFamily("CAP-2", null, PierCapType.RECTANGULAR,
                PierCapConfiguration.SINGLE_COLUMN, new RangeRule(null, null, null), new RangeRule(1.0, null, null),
                null, null, null);
        PierCapFamily bare = new PierCapFamily("CAP-3", null, null, null, null, null, null, null, null);
        return new PierCapFamilyCatalog(List.of(full, emptyRules, bare));
    }

    public static FoundationFamilyCatalog foundationFamilies() {
        FoundationFamily piled = new FoundationFamily("F-1", "Kazık", FoundationFamilyType.PILED, true,
                null, new FoundationFamily.PiledGeneration(rule(0.8, 1.2, 0.2), rule(2, 4, 1), rule(2.5, 3.0, 0.5),
                        rule(2, 3, 1), rule(2.5, 3.0, 0.5), new RangeRule(null, null, null)),
                "src");
        FoundationFamily shallow = new FoundationFamily("F-2", "Sığ", FoundationFamilyType.SHALLOW, false,
                new FoundationFamily.ShallowGeneration(rule(5, 4, 1), rule(1, 2, 0), rule(AWKWARD, 1, 1)), null,
                null);
        FoundationFamily both = new FoundationFamily("F-3", null, null, null,
                new FoundationFamily.ShallowGeneration(rule(1, 2, 3), rule(1, 2, 3), rule(1, 2, 3)),
                new FoundationFamily.PiledGeneration(rule(1, 2, 3), rule(1, 2, 3), rule(1, 2, 3), rule(1, 2, 3),
                        rule(1, 2, 3), rule(1, 2, 3)),
                null);
        FoundationFamily bare = new FoundationFamily("F-4", null, null, null, null, null, null);
        return new FoundationFamilyCatalog(List.of(piled, shallow, both, bare));
    }

    public static BearingFamilyCatalog bearingFamilies() {
        BearingFamily full = new BearingFamily("B-1", "Elastomerik", BearingFamilyType.ELASTOMERIC, true,
                rule(300, 500, 50), rule(300, 500, 50), rule(40, 20, 0), "src");
        BearingFamily partial = new BearingFamily("B-2", null, null, false, new RangeRule(null, null, null), null,
                rule(1, 1, 1), null);
        return new BearingFamilyCatalog(List.of(full, partial));
    }

    public static MaterialAssignmentCatalog materialAssignments() {
        return new MaterialAssignmentCatalog(List.of(new MaterialAssignment("FOUNDATION", 2.0, "Foundation",
                "C30/37 Ç"), new MaterialAssignment("BARE", null, null, null)));
    }

    // ------------------------------------------------------------------ other sections

    public static GirderLibrarySection girderLibrary() {
        return new GirderLibrarySection(new GirderLibrary(true, List.of(new SweepDimension("H", "H (cm)", 160.0,
                190.0, 10.0))));
    }

    public static PreferredSpanRulesSection preferredSpanRules() {
        return new PreferredSpanRulesSection(List.of(
                new PreferredSpanRule("girder-span-PG-H160", "PRECAST_GIRDER", "PG-H160", 5.0, -1.0, 0.0, AWKWARD,
                        true, "PROJECT_DESIGN_SYSTEM"),
                new PreferredSpanRule("girder-span-PG-H160", "other ç", "PG-H160", 0, 0, 0, 0, false, "")));
    }

    public static CrossSectionSection crossSection() {
        return new CrossSectionSection(new CrossSectionValues(13.8, 1.0, 1.5, AWKWARD, 5.0));
    }
}
