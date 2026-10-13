package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.kopruq.bridge.api.DesignSystemPutRequests.SectionPut;
import com.kopruq.bridge.application.ProjectRevision;
import com.kopruq.bridge.application.ProjectService;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/**
 * The design-system sections of a stored project: bridge definitions, the five family catalogs, the girder library,
 * the preferred span rules and the cross section. Each {@code PUT} replaces its whole section if
 * {@code expectedRevision} is current (else 409). Bodies are read strictly and validated structurally; the girder
 * library, preferred span rules and cross section accept {@code "value": null} to clear the section. CORS comes from
 * the central policy.
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
public class ProjectDesignSystemController {

    private static final String VALUE = "value";

    private final ProjectService projects;
    private final ProjectRequestReader reader;

    public ProjectDesignSystemController(ProjectService projects, ProjectRequestReader reader) {
        this.projects = projects;
        this.reader = reader;
    }

    @PutMapping("/bridge-definitions")
    public SectionWriteResponse<BridgeDefinitionsDto> putBridgeDefinitions(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.BridgeDefinitionsPut.class,
                v -> BridgeDefinitionsMapper.toModel(v, VALUE), BridgeDefinitionsMapper::toDto);
    }

    @PutMapping("/families/piers")
    public SectionWriteResponse<List<FamilyDtos.PierFamilyDto>> putPierFamilies(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.PierFamiliesPut.class,
                v -> FamilyCatalogMapper.toPiers(v, VALUE), FamilyCatalogMapper::piersDto);
    }

    @PutMapping("/families/pier-caps")
    public SectionWriteResponse<List<FamilyDtos.PierCapFamilyDto>> putPierCapFamilies(
            @PathVariable UUID projectId, @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.PierCapFamiliesPut.class,
                v -> FamilyCatalogMapper.toPierCaps(v, VALUE), FamilyCatalogMapper::pierCapsDto);
    }

    @PutMapping("/families/foundations")
    public SectionWriteResponse<List<FamilyDtos.FoundationFamilyDto>> putFoundationFamilies(
            @PathVariable UUID projectId, @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.FoundationFamiliesPut.class,
                v -> FamilyCatalogMapper.toFoundations(v, VALUE), FamilyCatalogMapper::foundationsDto);
    }

    @PutMapping("/families/bearings")
    public SectionWriteResponse<List<FamilyDtos.BearingFamilyDto>> putBearingFamilies(
            @PathVariable UUID projectId, @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.BearingFamiliesPut.class,
                v -> FamilyCatalogMapper.toBearings(v, VALUE), FamilyCatalogMapper::bearingsDto);
    }

    @PutMapping("/families/materials")
    public SectionWriteResponse<List<FamilyDtos.MaterialAssignmentDto>> putMaterialAssignments(
            @PathVariable UUID projectId, @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.MaterialAssignmentsPut.class,
                v -> FamilyCatalogMapper.toMaterials(v, VALUE), FamilyCatalogMapper::materialsDto);
    }

    @PutMapping("/girder-library")
    public SectionWriteResponse<GirderLibraryDto> putGirderLibrary(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.GirderLibraryPut.class,
                v -> DesignModuleMapper.toGirderLibrary(v, VALUE), s -> DesignModuleMapper.girderLibraryDto(s.library()));
    }

    @PutMapping("/preferred-span-rules")
    public SectionWriteResponse<List<PreferredSpanRuleDto>> putPreferredSpanRules(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.PreferredSpanRulesPut.class,
                v -> DesignModuleMapper.toPreferredSpanRules(v, VALUE),
                s -> DesignModuleMapper.preferredSpanRulesDto(s.rules()));
    }

    @PutMapping("/cross-section")
    public SectionWriteResponse<CrossSectionDto> putCrossSection(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return write(projectId, body, DesignSystemPutRequests.CrossSectionPut.class,
                v -> DesignModuleMapper.toCrossSection(v, VALUE), s -> DesignModuleMapper.crossSectionDto(s.values()));
    }

    /**
     * Shared flow: read the body strictly, collect the {@code expectedRevision} and {@code value} problems in one 400,
     * replace the section through the service, and answer with the stored value.
     */
    private <V, M extends ProjectSection, R> SectionWriteResponse<R> write(UUID projectId, JsonNode body,
            Class<? extends SectionPut<V>> type, Function<V, M> toModel, Function<M, R> toDto) {
        SectionPut<V> request = reader.read(body, type);
        List<FieldViolation> violations = new ArrayList<>();
        if (request.expectedRevision() == null) {
            violations.add(new FieldViolation("expectedRevision", "is required"));
        }
        M model = null;
        if (!body.has(VALUE)) {
            violations.add(new FieldViolation(VALUE, "is required"));
        } else {
            try {
                model = toModel.apply(request.value());
            } catch (InvalidRequestException e) {
                violations.addAll(e.violations());
            }
        }
        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
        ProjectRevision revision = projects.replace(projectId, request.expectedRevision(), model);
        return new SectionWriteResponse<>(revision.projectId(), revision.revision(), revision.updatedUtc(),
                toDto.apply(model));
    }
}
