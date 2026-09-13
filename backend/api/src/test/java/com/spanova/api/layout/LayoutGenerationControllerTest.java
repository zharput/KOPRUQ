package com.spanova.api.layout;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LayoutGenerationControllerTest {

    // Same hand-computed scenario as BridgeLayoutEngineTest: 100 m site,
    // span range 30-50 m step 10, span count 2-3, C1 fixed at chainage 0
    // -> 4 alternatives, one rejected once a no-pier zone blocks chainage 40.
    private static LayoutGenerationRequest requestWithZone(List<NoPierZoneRequest> zones) {
        return new LayoutGenerationRequest(100, 0, 100, "River", zones, 30, 50, 2, 3, 10, 100);
    }

    @Test
    void generate_withNoZones_returnsFourFeasibleAlternatives() {
        var controller = new LayoutGenerationController();

        List<LayoutAlternativeRow> rows = controller.generate(requestWithZone(List.of()));

        assertEquals(4, rows.size());
        assertTrue(rows.stream().allMatch(LayoutAlternativeRow::feasible));
    }

    @Test
    void generate_withNoPierZone_rejectsExactlyOneAlternative() {
        var controller = new LayoutGenerationController();
        var zone = new NoPierZoneRequest("NPZ-1", 38, 42, "Main river channel");

        List<LayoutAlternativeRow> rows = controller.generate(requestWithZone(List.of(zone)));

        assertEquals(4, rows.size());
        assertEquals(1, rows.stream().filter(r -> !r.feasible()).count());

        var rejected = rows.stream().filter(r -> !r.feasible()).findFirst().orElseThrow();
        assertEquals(1, rejected.piers().size());
        assertEquals(40, rejected.piers().get(0).chainageM(), 1e-6);
        assertTrue(!rejected.piers().get(0).feasible());
    }

    @Test
    void generate_withNullZonesList_treatsAsNoConstraints() {
        var controller = new LayoutGenerationController();
        var request = new LayoutGenerationRequest(100, 0, 100, "River", null, 30, 50, 2, 3, 10, 100);

        List<LayoutAlternativeRow> rows = controller.generate(request);

        assertEquals(4, rows.size());
    }
}
