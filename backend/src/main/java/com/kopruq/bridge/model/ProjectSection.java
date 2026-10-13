package com.kopruq.bridge.model;

/**
 * One independently replaceable part of a project's stored content: the workspace (M1), the design-system sections
 * (M2), and the six load-input sections and the graph documents (M3).
 */
public sealed interface ProjectSection permits ProjectWorkspace, BridgeDefinitions, PierFamilyCatalog,
        PierCapFamilyCatalog, FoundationFamilyCatalog, BearingFamilyCatalog, MaterialAssignmentCatalog,
        GirderLibrarySection, PreferredSpanRulesSection, CrossSectionSection, SeismicInputsSection,
        WindInputsSection, TemperatureInputsSection, SelfWeightInputsSection, TrafficLm1Section,
        WindSnapshotSection, GraphDocument {
}
