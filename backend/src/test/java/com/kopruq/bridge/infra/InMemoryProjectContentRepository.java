package com.kopruq.bridge.infra;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.application.ProjectContentRepository;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.ProjectWorkspace;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Test double of the {@link ProjectContentRepository} port. Keeps one {@link ProjectContent} per project. */
public class InMemoryProjectContentRepository implements ProjectContentRepository {

    private final Map<UUID, ProjectContent> contents = new HashMap<>();
    private int replaceCalls;

    @Override
    public ProjectContent load(UUID projectId) {
        return contents.getOrDefault(projectId, ProjectContent.ofWorkspace(null));
    }

    @Override
    public void replace(UUID projectId, ProjectSection section) {
        replaceCalls++;
        ProjectContent c = load(projectId);
        contents.put(projectId, switch (section) {
            case ProjectWorkspace s -> new ProjectContent(s, c.bridgeDefinitions(), c.pierFamilies(),
                    c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection());
            case BridgeDefinitions s -> new ProjectContent(c.workspace(), s, c.pierFamilies(), c.pierCapFamilies(),
                    c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(), c.girderLibrary(),
                    c.preferredSpanRules(), c.crossSection());
            case PierFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(), s,
                    c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection());
            case PierCapFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), s, c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection());
            case FoundationFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), s, c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection());
            case BearingFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), s, c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection());
            case MaterialAssignmentCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(), s,
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection());
            case GirderLibrarySection s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(),
                    c.materialAssignments(), s.library(), c.preferredSpanRules(), c.crossSection());
            case PreferredSpanRulesSection s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(),
                    c.materialAssignments(), c.girderLibrary(), s.rules(), c.crossSection());
            case CrossSectionSection s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(),
                    c.materialAssignments(), c.girderLibrary(), c.preferredSpanRules(), s.values());
        });
    }

    public int replaceCalls() {
        return replaceCalls;
    }
}
