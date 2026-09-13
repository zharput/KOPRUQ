package com.spanova.bridgelayout;

import com.spanova.alignment.Alignment;
import com.spanova.alignment.StraightElement;
import com.spanova.constraints.NoPierZone;
import com.spanova.spatialcore.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BridgeLayoutEngineTest {

    // Straight 100 m alignment, the whole thing is the bridge site.
    private static Alignment alignment100m() {
        return new Alignment(List.of(new StraightElement(new Point3D(0, 0, 0), new Point3D(100, 0, 0))));
    }

    private static BridgeSite fullSite() {
        return new BridgeSite("SITE-1", "Test crossing", 0, 100, "River");
    }

    // C1 fixed at chainage 0 (c1StepM = 100, larger than the site, so only
    // one C1 candidate is tried) x spanCount in {2,3} x spanLength in
    // {30,40,50} (step 10):
    //   spanCount=2: length=30 -> C2=60  (fits, pier @30)
    //                length=40 -> C2=80  (fits, pier @40)
    //                length=50 -> C2=100 (fits, pier @50)
    //   spanCount=3: length=30 -> C2=90  (fits, piers @30,60)
    //                length=40 -> C2=120 (> site end 100 - not generated)
    //                length=50 -> C2=150 (> site end 100 - not generated)
    // -> 4 alternatives generated.
    private static LayoutDesignSpace testDesignSpace() {
        return new LayoutDesignSpace(30, 50, 2, 3, 10, 100);
    }

    @Test
    void generate_producesOnlyArrangementsThatFitTheSite() {
        var alternatives = new BridgeLayoutEngine().generate(alignment100m(), fullSite(), List.of(), testDesignSpace());

        assertEquals(4, alternatives.size());
        for (var alt : alternatives) {
            assertTrue(alt.c2().chainageM() <= 100 + 1e-6);
            assertEquals(alt.c1().chainageM() + alt.bridgeLengthM(), alt.c2().chainageM(), 1e-6);
        }
    }

    @Test
    void generate_withNoConstraints_everyAlternativeIsFeasible() {
        var alternatives = new BridgeLayoutEngine().generate(alignment100m(), fullSite(), List.of(), testDesignSpace());

        assertTrue(alternatives.stream().allMatch(a -> a.feasibilityStatus() == FeasibilityStatus.FEASIBLE));
    }

    @Test
    void generate_pierInsideNoPierZone_rejectsOnlyThatAlternative() {
        // Blocks chainage 40 (the spanCount=2/spanLength=40 alternative's only pier).
        var noPierZone = new NoPierZone("NPZ-1", 38, 42, "Main river channel");

        var alternatives = new BridgeLayoutEngine().generate(
                alignment100m(), fullSite(), List.of(noPierZone), testDesignSpace());

        assertEquals(4, alternatives.size());

        long rejected = alternatives.stream().filter(a -> a.feasibilityStatus() == FeasibilityStatus.REJECT).count();
        assertEquals(1, rejected);

        var rejectedAlt = alternatives.stream()
                .filter(a -> a.feasibilityStatus() == FeasibilityStatus.REJECT)
                .findFirst().orElseThrow();
        assertEquals(1, rejectedAlt.piers().size());
        assertEquals(40, rejectedAlt.piers().get(0).chainageM(), 1e-6);
        assertFalse(rejectedAlt.piers().get(0).rejectionReasons().isEmpty());

        // The spanCount=3 alternative has piers at 30 and 60 - neither inside [38,42] - stays feasible.
        boolean threeSpanFeasible = alternatives.stream()
                .anyMatch(a -> a.piers().size() == 2 && a.feasibilityStatus() == FeasibilityStatus.FEASIBLE);
        assertTrue(threeSpanFeasible);
    }

    @Test
    void generate_constraintResults_recordEveryPierZoneCheck() {
        var noPierZone = new NoPierZone("NPZ-1", 38, 42, "Main river channel");

        var alternatives = new BridgeLayoutEngine().generate(
                alignment100m(), fullSite(), List.of(noPierZone), testDesignSpace());

        // spanCount=2, spanLength=30 -> 1 pier -> exactly 1 constraint check, not violated.
        var singlePierFeasible = alternatives.stream()
                .filter(a -> a.piers().size() == 1 && a.piers().get(0).chainageM() == 30)
                .findFirst().orElseThrow();
        assertEquals(1, singlePierFeasible.constraintResults().size());
        assertFalse(singlePierFeasible.constraintResults().get(0).violated());
    }

    @Test
    void generate_siteOutsideAlignment_throws() {
        var alignment = alignment100m();
        var badSite = new BridgeSite("SITE-2", "Too long", 0, 150, "River");

        assertThrows(IllegalArgumentException.class,
                () -> new BridgeLayoutEngine().generate(alignment, badSite, List.of(), testDesignSpace()));
    }

    @Test
    void generate_invalidSpanRange_throws() {
        var invalidSpace = new LayoutDesignSpace(50, 10, 2, 3, 10, 100);

        assertThrows(IllegalArgumentException.class,
                () -> new BridgeLayoutEngine().generate(alignment100m(), fullSite(), List.of(), invalidSpace));
    }

    @Test
    void generate_narrowSite_findsNoFeasibleArrangement() {
        var narrowSite = new BridgeSite("SITE-3", "Too narrow", 0, 20, "River");

        var alternatives = new BridgeLayoutEngine().generate(
                alignment100m(), narrowSite, List.of(), testDesignSpace());

        assertTrue(alternatives.isEmpty());
    }
}
