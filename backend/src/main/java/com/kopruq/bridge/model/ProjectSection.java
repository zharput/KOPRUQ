package com.kopruq.bridge.model;

/**
 * One independently replaceable part of a project's stored content: the workspace (M1) and the design-system
 * sections (M2). Later milestones add their sections to the {@code permits} list.
 */
public sealed interface ProjectSection permits ProjectWorkspace, BridgeDefinitions, PierFamilyCatalog,
        PierCapFamilyCatalog, FoundationFamilyCatalog, BearingFamilyCatalog, MaterialAssignmentCatalog,
        GirderLibrarySection, PreferredSpanRulesSection, CrossSectionSection {
}
