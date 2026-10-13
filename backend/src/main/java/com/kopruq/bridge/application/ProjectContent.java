package com.kopruq.bridge.application;

import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionValues;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.GraphDocument;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRule;
import com.kopruq.bridge.model.ProjectWorkspace;

import java.util.List;

/**
 * The stored sections of a project. Every component is null when that section was never written (or, for the girder
 * library, preferred span rules and cross section, was cleared); an empty list is a written empty list. {@code loads}
 * is never null (its members are); {@code graphs} is never null (empty when no graph was written), in creation order.
 */
public record ProjectContent(ProjectWorkspace workspace, BridgeDefinitions bridgeDefinitions,
        PierFamilyCatalog pierFamilies, PierCapFamilyCatalog pierCapFamilies,
        FoundationFamilyCatalog foundationFamilies, BearingFamilyCatalog bearingFamilies,
        MaterialAssignmentCatalog materialAssignments, GirderLibrary girderLibrary,
        List<PreferredSpanRule> preferredSpanRules, CrossSectionValues crossSection, ProjectLoadInputs loads,
        List<GraphDocument> graphs) {

    public ProjectContent {
        loads = loads == null ? ProjectLoadInputs.NONE : loads;
        graphs = graphs == null ? List.of() : List.copyOf(graphs);
    }

    /** The M1/M2 shape: no load inputs and no graphs. */
    public ProjectContent(ProjectWorkspace workspace, BridgeDefinitions bridgeDefinitions,
            PierFamilyCatalog pierFamilies, PierCapFamilyCatalog pierCapFamilies,
            FoundationFamilyCatalog foundationFamilies, BearingFamilyCatalog bearingFamilies,
            MaterialAssignmentCatalog materialAssignments, GirderLibrary girderLibrary,
            List<PreferredSpanRule> preferredSpanRules, CrossSectionValues crossSection) {
        this(workspace, bridgeDefinitions, pierFamilies, pierCapFamilies, foundationFamilies, bearingFamilies,
                materialAssignments, girderLibrary, preferredSpanRules, crossSection, ProjectLoadInputs.NONE,
                List.of());
    }

    /** Content holding only a workspace (or nothing, when {@code workspace} is null). */
    public static ProjectContent ofWorkspace(ProjectWorkspace workspace) {
        return new ProjectContent(workspace, null, null, null, null, null, null, null, null, null);
    }

    /** The same content with the given load inputs and graphs. */
    public ProjectContent withLoadsAndGraphs(ProjectLoadInputs newLoads, List<GraphDocument> newGraphs) {
        return new ProjectContent(workspace, bridgeDefinitions, pierFamilies, pierCapFamilies, foundationFamilies,
                bearingFamilies, materialAssignments, girderLibrary, preferredSpanRules, crossSection, newLoads,
                newGraphs);
    }
}
