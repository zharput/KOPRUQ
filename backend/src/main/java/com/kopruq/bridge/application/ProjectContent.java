package com.kopruq.bridge.application;

import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionValues;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRule;
import com.kopruq.bridge.model.ProjectWorkspace;

import java.util.List;

/**
 * The stored sections of a project. Every component is null when that section was never written (or, for the girder
 * library, preferred span rules and cross section, was cleared); an empty list is a written empty list.
 */
public record ProjectContent(ProjectWorkspace workspace, BridgeDefinitions bridgeDefinitions,
        PierFamilyCatalog pierFamilies, PierCapFamilyCatalog pierCapFamilies,
        FoundationFamilyCatalog foundationFamilies, BearingFamilyCatalog bearingFamilies,
        MaterialAssignmentCatalog materialAssignments, GirderLibrary girderLibrary,
        List<PreferredSpanRule> preferredSpanRules, CrossSectionValues crossSection) {

    /** Content holding only a workspace (or nothing, when {@code workspace} is null). */
    public static ProjectContent ofWorkspace(ProjectWorkspace workspace) {
        return new ProjectContent(workspace, null, null, null, null, null, null, null, null, null);
    }
}
