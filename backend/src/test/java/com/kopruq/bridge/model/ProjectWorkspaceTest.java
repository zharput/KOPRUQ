package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.BridgeInventoryType;
import com.kopruq.bridge.enums.InventoryPierShape;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static com.kopruq.bridge.WorkspaceFixtures.info;
import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.rowWithoutDepths;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectWorkspaceTest {

    private static BridgeInventoryRow rowWith(String id, double length, double width, List<Double> spans,
            List<Double> depths) {
        return new BridgeInventoryRow(id, "n", "k", "c", length, width, "t", "s", BridgeInventoryType.PRECAST_GIRDER,
                spans, depths, null, InventoryPierShape.BOX);
    }

    @Test
    void blankRowId_isRejected() {
        assertThrows(IllegalArgumentException.class, () -> row(" "));
        assertThrows(IllegalArgumentException.class, () -> row(""));
    }

    @Test
    void duplicateRowIds_areRejected() {
        var e = assertThrows(IllegalArgumentException.class,
                () -> new ProjectWorkspace(info("p"), List.of(row("a"), row("b"), row("a"))));
        assertTrue(e.getMessage().contains("duplicate"));
    }

    @Test
    void nonFiniteNumbers_areRejected() {
        assertThrows(IllegalArgumentException.class, () -> rowWith("a", Double.NaN, 1, List.of(), null));
        assertThrows(IllegalArgumentException.class, () -> rowWith("a", 1, Double.POSITIVE_INFINITY, List.of(), null));
        assertThrows(IllegalArgumentException.class, () -> rowWith("a", 1, 1, List.of(1.0, Double.NaN), null));
        assertThrows(IllegalArgumentException.class,
                () -> rowWith("a", 1, 1, List.of(), List.of(Double.NEGATIVE_INFINITY)));
    }

    @Test
    void nullListElement_isRejected() {
        assertThrows(IllegalArgumentException.class, () -> rowWith("a", 1, 1, Arrays.asList(1.0, null), null));
        assertThrows(IllegalArgumentException.class, () -> rowWith("a", 1, 1, List.of(), Arrays.asList((Double) null)));
    }

    @Test
    void nullGirderDepths_isNotTheSameAsAnEmptyList() {
        assertNull(rowWith("a", 1, 1, List.of(), null).girderDepthCm());
        assertEquals(List.of(), rowWith("a", 1, 1, List.of(), List.of()).girderDepthCm());
    }

    @Test
    void zeroAndNegativeLengths_areAccepted_noEngineeringRangeIsApplied() {
        var r = rowWith("a", 0, -3, List.of(-1.0, 0.0), List.of(-5.0));
        assertEquals(0, r.estimatedLengthM());
        assertEquals(-3, r.roadWidthM());
    }

    @Test
    void lists_areCopied() {
        List<Double> spans = new ArrayList<>(List.of(1.0, 2.0));
        var r = rowWith("a", 1, 1, spans, null);
        spans.add(3.0);
        assertEquals(List.of(1.0, 2.0), r.spansM());
        List<BridgeInventoryRow> rows = new ArrayList<>(List.of(row("a")));
        var w = new ProjectWorkspace(info("p"), rows);
        rows.add(row("b"));
        assertEquals(1, w.bridges().size());
    }

    @Test
    void emptyStringsAreValid_nullsAreNot() {
        var w = new ProjectWorkspace(info(""), List.of(rowWithoutDepths("a")));
        assertEquals("", w.project().name());
        assertThrows(NullPointerException.class, () -> new ProjectWorkspace(null, List.of()));
        assertThrows(NullPointerException.class, () -> new ProjectWorkspace(info("p"), null));
    }

    @Test
    void enumLabels_roundTrip() {
        for (BridgeInventoryType t : BridgeInventoryType.values()) {
            assertEquals(t, BridgeInventoryType.fromLabel(t.label()).orElseThrow());
        }
        for (InventoryPierShape s : InventoryPierShape.values()) {
            assertEquals(s, InventoryPierShape.fromLabel(s.label()).orElseThrow());
        }
        assertTrue(BridgeInventoryType.fromLabel("precast girder").isEmpty());
        assertTrue(InventoryPierShape.fromLabel(null).isEmpty());
    }
}
