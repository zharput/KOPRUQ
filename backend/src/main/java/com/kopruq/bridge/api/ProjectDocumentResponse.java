package com.kopruq.bridge.api;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.application.ProjectDocument;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Body of {@code POST /api/projects} (201) and {@code GET /api/projects/{projectId}}. The first five keys are the M1
 * ones; the design-system sections follow, then {@code loads} and {@code graphs} (M3). Every section is null until it
 * has been written ({@code families} and {@code loads} are always objects, with each member null until written);
 * a written empty list reads back as {@code []}. {@code graphs} is always an array, in creation order.
 */
public record ProjectDocumentResponse(UUID projectId, long revision, Instant createdAt, Instant updatedAt,
        WorkspaceDto workspace, BridgeDefinitionsDto bridgeDefinitions, FamiliesDto families,
        GirderLibraryDto girderLibrary, List<PreferredSpanRuleDto> preferredSpanRules,
        CrossSectionDto crossSection, LoadsDto loads, List<GraphDtos.GraphDto> graphs) {

    static ProjectDocumentResponse from(ProjectDocument d) {
        ProjectContent c = d.content();
        FamiliesDto families = new FamiliesDto(FamilyCatalogMapper.piersDto(c.pierFamilies()),
                FamilyCatalogMapper.pierCapsDto(c.pierCapFamilies()),
                FamilyCatalogMapper.foundationsDto(c.foundationFamilies()),
                FamilyCatalogMapper.bearingsDto(c.bearingFamilies()),
                FamilyCatalogMapper.materialsDto(c.materialAssignments()));
        return new ProjectDocumentResponse(d.projectId(), d.revision(), d.createdUtc(), d.updatedUtc(),
                c.workspace() == null ? null : ProjectWorkspaceMapper.toDto(c.workspace()),
                BridgeDefinitionsMapper.toDto(c.bridgeDefinitions()), families,
                DesignModuleMapper.girderLibraryDto(c.girderLibrary()),
                DesignModuleMapper.preferredSpanRulesDto(c.preferredSpanRules()),
                DesignModuleMapper.crossSectionDto(c.crossSection()), LoadInputMapper.loadsDto(c.loads()),
                GraphDocumentMapper.toDtos(c.graphs()));
    }
}
