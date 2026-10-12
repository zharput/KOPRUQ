package com.kopruq.api.layout.api;

import com.kopruq.bridgelayout.BridgeLayoutEngine;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LayoutGenerationControllerTest {

    // Same hand-computed scenario as BridgeLayoutEngineTest: 100 m site,
    // span range 30-50 m step 10, span count 2-3, C1 fixed at chainage 0
    // -> 4 alternatives, one rejected once a no-pier zone blocks chainage 40.
    private static LayoutGenerationRequest requestWithZone(List<NoPierZoneRequest> zones) {
        return new LayoutGenerationRequest(100.0, 0.0, 100.0, "River", zones, 30.0, 50.0, 2, 3, 10.0, 100.0);
    }

    @Test
    void generate_withNoZones_returnsFourFeasibleAlternatives() {
        var controller = new LayoutGenerationController(new BridgeLayoutEngine());

        List<LayoutAlternativeRow> rows = controller.generate(requestWithZone(List.of()));

        assertEquals(4, rows.size());
        assertTrue(rows.stream().allMatch(LayoutAlternativeRow::feasible));
    }

    @Test
    void generate_withNoPierZone_rejectsExactlyOneAlternative() {
        var controller = new LayoutGenerationController(new BridgeLayoutEngine());
        var zone = new NoPierZoneRequest("NPZ-1", 38.0, 42.0, "Main river channel");

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
        var controller = new LayoutGenerationController(new BridgeLayoutEngine());
        var request = new LayoutGenerationRequest(100.0, 0.0, 100.0, "River", null, 30.0, 50.0, 2, 3, 10.0, 100.0);

        List<LayoutAlternativeRow> rows = controller.generate(request);

        assertEquals(4, rows.size());
    }
}
