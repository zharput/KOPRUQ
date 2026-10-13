package com.kopruq.bridge.model;

import com.kopruq.shared.exception.RevisionConflictException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Objects;
import java.util.UUID;

/**
 * The root KOPRUQ project object (spec section 18 describes the
 * eventual .kopruq-equivalent project persistence; persistence itself
 * is stored by {@code bridge.infra.persistence}, see docs/architecture.md).
 *
 * <p>Mutable by design (unlike the other bridge-core types, which are
 * immutable records): a Project represents evolving session/application
 * state - new alternatives get generated into it, a selection changes,
 * etc. - mirroring the archived C#/Avalonia build's Project class.
 */
public final class Project {

    private UUID id = UUID.randomUUID();
    private String projectName = "";
    private Instant createdUtc;
    private long revision = 0;
    private Instant updatedUtc;
    private Bridge bridge;
    private DesignSpace designSpace;
    private final List<BridgeAlternative> generatedAlternatives = new ArrayList<>();
    private UUID selectedAlternativeId;

    public Project() {
        Instant now = Instant.now();
        this.createdUtc = now;
        this.updatedUtc = now;
    }

    /** Stable identity of the project (assigned at construction; persistence restores a stored one with {@link #setId}). */
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = Objects.requireNonNull(id, "id");
    }

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

    /** Domain revision: the number of recorded changes (0 for a new project). Not the technical row version. */
    public long getRevision() {
        return revision;
    }

    public Instant getUpdatedUtc() {
        return updatedUtc;
    }

    /** Restores a stored revision and last-change time (persistence), or sets the initial ones (creation). */
    public void restoreRevision(long revision, Instant updatedUtc) {
        if (revision < 0) {
            throw new IllegalArgumentException("revision must not be negative");
        }
        if (updatedUtc == null) {
            throw new IllegalArgumentException("updatedUtc is required");
        }
        this.revision = revision;
        this.updatedUtc = updatedUtc;
    }

    /** The write is only allowed against the current revision; otherwise the client holds a stale copy. */
    public void requireRevision(long expected) {
        if (expected != revision) {
            throw new RevisionConflictException(expected, revision);
        }
    }

    /** Records one accepted change: the revision grows by one and the last-change time is {@code now}. */
    public void recordChange(Instant now) {
        this.updatedUtc = Objects.requireNonNull(now, "now");
        this.revision++;
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
