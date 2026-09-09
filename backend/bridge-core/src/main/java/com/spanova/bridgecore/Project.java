package com.spanova.bridgecore;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The root SPANOVA project object (spec section 18 describes the
 * eventual .spanova-equivalent project persistence; persistence itself
 * is out of scope for P01, see docs/roadmap.md).
 *
 * <p>Mutable by design (unlike the other bridge-core types, which are
 * immutable records): a Project represents evolving session/application
 * state - new alternatives get generated into it, a selection changes,
 * etc. - mirroring the archived C#/Avalonia build's Project class.
 */
public final class Project {

    private String projectName = "";
    private Instant createdUtc = Instant.now();
    private Bridge bridge;
    private DesignSpace designSpace;
    private final List<BridgeAlternative> generatedAlternatives = new ArrayList<>();
    private UUID selectedAlternativeId;

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public Instant getCreatedUtc() {
        return createdUtc;
    }

    public void setCreatedUtc(Instant createdUtc) {
        this.createdUtc = createdUtc;
    }

    public Bridge getBridge() {
        return bridge;
    }

    public void setBridge(Bridge bridge) {
        this.bridge = bridge;
    }

    public DesignSpace getDesignSpace() {
        return designSpace;
    }

    public void setDesignSpace(DesignSpace designSpace) {
        this.designSpace = designSpace;
    }

    public List<BridgeAlternative> getGeneratedAlternatives() {
        return generatedAlternatives;
    }

    public void setGeneratedAlternatives(List<BridgeAlternative> alternatives) {
        generatedAlternatives.clear();
        generatedAlternatives.addAll(alternatives);
    }

    public UUID getSelectedAlternativeId() {
        return selectedAlternativeId;
    }

    public void setSelectedAlternativeId(UUID selectedAlternativeId) {
        this.selectedAlternativeId = selectedAlternativeId;
    }

    public Optional<BridgeAlternative> getSelectedAlternative() {
        if (selectedAlternativeId == null) {
            return Optional.empty();
        }
        return generatedAlternatives.stream()
                .filter(a -> a.id().equals(selectedAlternativeId))
                .findFirst();
    }
}
