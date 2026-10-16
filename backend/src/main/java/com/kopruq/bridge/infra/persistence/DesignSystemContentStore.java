package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.model.BearingFamily;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinition;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.CrossSectionValues;
import com.kopruq.bridge.model.FoundationFamily;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.MaterialAssignment;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamily;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamily;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRule;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.ProjectWorkspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Reads and writes the design-system sections (bridge definitions, family catalogs, girder library, preferred span
 * rules, cross section). Kept apart from the workspace adapter so that one stays small. It has no transaction of its
 * own: it runs inside the {@link JpaProjectContentRepository} transaction, which also makes the LAZY child lists
 * readable in {@code toDomain}.
 *
 * <p>Whole-section replacement: delete, {@code flush}, insert, {@code flush} (Hibernate runs INSERTs before DELETEs,
 * which would otherwise violate the UNIQUE (project_id, id) constraints when rows keep their ids). A list section
 * that was written has a {@code project_section_presence} row, so a written {@code []} reads back as {@code []} and
 * a never-written (or cleared) section as null.
 */
@Component
class DesignSystemContentStore {

    private final ProjectSectionPresenceJpaRepository presence;
    private final BridgeDefinitionJpaRepository definitions;
    private final PierFamilyJpaRepository piers;
    private final PierCapFamilyJpaRepository pierCaps;
    private final FoundationFamilyJpaRepository foundations;
    private final BearingFamilyJpaRepository bearings;
    private final MaterialAssignmentJpaRepository materials;
    private final GirderLibraryJpaRepository girderLibraries;
    private final PreferredSpanRuleJpaRepository spanRules;
    private final CrossSectionJpaRepository crossSections;

    DesignSystemContentStore(ProjectSectionPresenceJpaRepository presence, BridgeDefinitionJpaRepository definitions,
            PierFamilyJpaRepository piers, PierCapFamilyJpaRepository pierCaps,
            FoundationFamilyJpaRepository foundations, BearingFamilyJpaRepository bearings,
            MaterialAssignmentJpaRepository materials, GirderLibraryJpaRepository girderLibraries,
            PreferredSpanRuleJpaRepository spanRules, CrossSectionJpaRepository crossSections) {
        this.presence = presence;
        this.definitions = definitions;
        this.piers = piers;
        this.pierCaps = pierCaps;
        this.foundations = foundations;
        this.bearings = bearings;
        this.materials = materials;
        this.girderLibraries = girderLibraries;
        this.spanRules = spanRules;
        this.crossSections = crossSections;
    }

    // ------------------------------------------------------------------ load

    /** Every stored section of the project, with the given (possibly null) workspace. */
    ProjectContent load(UUID projectId, ProjectWorkspace workspace) {
        Set<StoredSection> written = EnumSet.noneOf(StoredSection.class);
        presence.findByProjectId(projectId).forEach(p -> written.add(p.getSection()));

        BridgeDefinitions bridgeDefinitions = !written.contains(StoredSection.BRIDGE_DEFINITIONS) ? null
                : new BridgeDefinitions(definitions.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(BridgeDefinitionEntity::toDomain).toList());
        PierFamilyCatalog pierCatalog = !written.contains(StoredSection.FAMILY_PIER) ? null
                : new PierFamilyCatalog(piers.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(PierFamilyEntity::toDomain).toList());
        PierCapFamilyCatalog pierCapCatalog = !written.contains(StoredSection.FAMILY_PIER_CAP) ? null
                : new PierCapFamilyCatalog(pierCaps.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(PierCapFamilyEntity::toDomain).toList());
        FoundationFamilyCatalog foundationCatalog = !written.contains(StoredSection.FAMILY_FOUNDATION) ? null
                : new FoundationFamilyCatalog(foundations.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(FoundationFamilyEntity::toDomain).toList());
        BearingFamilyCatalog bearingCatalog = !written.contains(StoredSection.FAMILY_BEARING) ? null
                : new BearingFamilyCatalog(bearings.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(BearingFamilyEntity::toDomain).toList());
        MaterialAssignmentCatalog materialCatalog = !written.contains(StoredSection.FAMILY_MATERIAL) ? null
                : new MaterialAssignmentCatalog(materials.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(MaterialAssignmentEntity::toDomain).toList());
        GirderLibrary girderLibrary = girderLibraries.findById(projectId).map(GirderLibraryEntity::toDomain)
                .orElse(null);
        List<PreferredSpanRule> rules = !written.contains(StoredSection.PREFERRED_SPAN_RULES) ? null
                : spanRules.findByProjectIdOrderByOrdinalAsc(projectId).stream()
                        .map(PreferredSpanRuleEntity::toDomain).toList();
        CrossSectionValues crossSection = crossSections.findById(projectId).map(CrossSectionEntity::toDomain)
                .orElse(null);
        return new ProjectContent(workspace, bridgeDefinitions, pierCatalog, pierCapCatalog, foundationCatalog,
                bearingCatalog, materialCatalog, girderLibrary, rules, crossSection);
    }

    /** Removes every design-system section of the project, including its presence rows. */
    void deleteAll(UUID projectId) {
        definitions.deleteByProjectId(projectId);
        piers.deleteByProjectId(projectId);
        pierCaps.deleteByProjectId(projectId);
        foundations.deleteByProjectId(projectId);
        bearings.deleteByProjectId(projectId);
        materials.deleteByProjectId(projectId);
        spanRules.deleteByProjectId(projectId);
        girderLibraries.findById(projectId).ifPresent(girderLibraries::delete);
        crossSections.findById(projectId).ifPresent(crossSections::delete);
        definitions.flush();
        presence.deleteByProjectId(projectId);
        presence.flush();
    }

    // ------------------------------------------------------------------ replace

    void replace(UUID projectId, BridgeDefinitions section) {
        List<BridgeDefinitionEntity> fresh = new ArrayList<>();
        List<BridgeDefinition> items = section.definitions();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new BridgeDefinitionEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.BRIDGE_DEFINITIONS, definitions,
                () -> definitions.deleteByProjectId(projectId), fresh, true);
    }

    void replace(UUID projectId, PierFamilyCatalog section) {
        List<PierFamilyEntity> fresh = new ArrayList<>();
        List<PierFamily> items = section.families();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new PierFamilyEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.FAMILY_PIER, piers, () -> piers.deleteByProjectId(projectId), fresh,
                true);
    }

    void replace(UUID projectId, PierCapFamilyCatalog section) {
        List<PierCapFamilyEntity> fresh = new ArrayList<>();
        List<PierCapFamily> items = section.families();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new PierCapFamilyEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.FAMILY_PIER_CAP, pierCaps, () -> pierCaps.deleteByProjectId(projectId),
                fresh, true);
    }

    void replace(UUID projectId, FoundationFamilyCatalog section) {
        List<FoundationFamilyEntity> fresh = new ArrayList<>();
        List<FoundationFamily> items = section.families();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new FoundationFamilyEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.FAMILY_FOUNDATION, foundations,
                () -> foundations.deleteByProjectId(projectId), fresh, true);
    }

    void replace(UUID projectId, BearingFamilyCatalog section) {
        List<BearingFamilyEntity> fresh = new ArrayList<>();
        List<BearingFamily> items = section.families();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new BearingFamilyEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.FAMILY_BEARING, bearings, () -> bearings.deleteByProjectId(projectId),
                fresh, true);
    }

    void replace(UUID projectId, MaterialAssignmentCatalog section) {
        List<MaterialAssignmentEntity> fresh = new ArrayList<>();
        List<MaterialAssignment> items = section.assignments();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new MaterialAssignmentEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.FAMILY_MATERIAL, materials,
                () -> materials.deleteByProjectId(projectId), fresh, true);
    }

    void replace(UUID projectId, PreferredSpanRulesSection section) {
        List<PreferredSpanRuleEntity> fresh = new ArrayList<>();
        List<PreferredSpanRule> items = section.rules() == null ? List.of() : section.rules();
        for (int i = 0; i < items.size(); i++) {
            fresh.add(new PreferredSpanRuleEntity(projectId, i, items.get(i)));
        }
        replaceList(projectId, StoredSection.PREFERRED_SPAN_RULES, spanRules,
                () -> spanRules.deleteByProjectId(projectId), fresh, section.rules() != null);
    }

    void replace(UUID projectId, GirderLibrarySection section) {
        girderLibraries.findById(projectId).ifPresent(girderLibraries::delete);
        girderLibraries.flush();
        if (section.library() != null) {
            girderLibraries.save(new GirderLibraryEntity(projectId, section.library()));
        }
        girderLibraries.flush();
    }

    void replace(UUID projectId, CrossSectionSection section) {
        crossSections.findById(projectId).ifPresent(crossSections::delete);
        crossSections.flush();
        if (section.values() != null) {
            crossSections.save(new CrossSectionEntity(projectId, section.values()));
        }
        crossSections.flush();
    }

    private <E> void replaceList(UUID projectId, StoredSection key, JpaRepository<E, UUID> repository,
            Runnable deleteExisting, List<E> fresh, boolean written) {
        deleteExisting.run();
        // Hibernate runs INSERTs before DELETEs: flush the delete first or the UNIQUE (project_id, ...) is violated.
        repository.flush();
        repository.saveAll(fresh);
        boolean marked = presence.existsByProjectIdAndSection(projectId, key);
        if (written && !marked) {
            presence.save(new ProjectSectionPresenceEntity(projectId, key));
        } else if (!written && marked) {
            presence.deleteByProjectIdAndSection(projectId, key);
        }
        repository.flush();
    }
}
