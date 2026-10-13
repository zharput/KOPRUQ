package com.kopruq.bridge;

import com.kopruq.bridge.enums.BridgeInventoryType;
import com.kopruq.bridge.enums.InventoryPierShape;
import com.kopruq.bridge.model.BridgeInventoryRow;
import com.kopruq.bridge.model.ProjectInfo;
import com.kopruq.bridge.model.ProjectWorkspace;

import java.util.List;

/** Workspace test data. The values are arbitrary test strings and numbers, not engineering data. */
public final class WorkspaceFixtures {

    private WorkspaceFixtures() {
    }

    public static ProjectInfo info(String name) {
        return new ProjectInfo(name, "PRJ-01", "client", "designer", "country", "region", "type", "status",
                "start", "target", "description çğıöşü", "locS", "locE", "crs", "family",
                "concrete", "steel", "composite", "seismic", "geo", "traffic",
                new ProjectInfo.Units("u1", "u2", "u3", "u4", "u5", "u6"),
                new ProjectInfo.Coordinate("c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"),
                new ProjectInfo.Criteria("k1", "k2", "k3", "k4", "k5", "k6"),
                new ProjectInfo.Environment(null, null), "modified");
    }

    public static BridgeInventoryRow row(String id) {
        return new BridgeInventoryRow(id, "no-" + id, "km", "crossing", 205.0, 13.8, "terrain", "status",
                BridgeInventoryType.PRECAST_GIRDER, List.of(30.0, 35.0, 40.0), List.of(160.0, 190.0), null,
                InventoryPierShape.CIRCULAR);
    }

    public static BridgeInventoryRow rowWithoutDepths(String id) {
        return new BridgeInventoryRow(id, "no-" + id, "km", "crossing", 1.0, 2.0, "t", "s",
                BridgeInventoryType.CANTILEVER_BRIDGE, List.of(), null, "a note", InventoryPierShape.OVAL);
    }

    public static ProjectWorkspace workspace(String name, BridgeInventoryRow... rows) {
        return new ProjectWorkspace(info(name), List.of(rows));
    }
}
