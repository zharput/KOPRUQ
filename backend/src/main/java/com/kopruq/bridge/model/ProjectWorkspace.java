package com.kopruq.bridge.model;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * The project information plus the bridge inventory, exactly as the engineer entered them. Nothing here is
 * interpreted: only structure is checked (present, unique row ids).
 */
public record ProjectWorkspace(ProjectInfo project, List<BridgeInventoryRow> bridges) implements ProjectSection {

    public ProjectWorkspace {
        Objects.requireNonNull(project, "project");
        Objects.requireNonNull(bridges, "bridges");
        bridges = List.copyOf(bridges);
        Set<String> ids = new HashSet<>();
        for (BridgeInventoryRow row : bridges) {
            if (!ids.add(row.id())) {
                throw new IllegalArgumentException("duplicate bridge id " + row.id());
            }
        }
    }
}
