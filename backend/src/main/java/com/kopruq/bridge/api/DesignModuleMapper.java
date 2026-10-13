package com.kopruq.bridge.api;

import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.CrossSectionValues;
import com.kopruq.bridge.model.GirderLibrary;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.PreferredSpanRule;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.SweepDimension;

import java.util.List;

/**
 * Converts the girder library, preferred span rules and cross section JSON shapes to the model and back. These three
 * sections accept null as "clear" (the frontend's reset). Values pass through untouched.
 */
final class DesignModuleMapper {

    private DesignModuleMapper() {
    }

    static GirderLibrarySection toGirderLibrary(GirderLibraryDto dto, String path) {
        if (dto == null) {
            return new GirderLibrarySection(null);
        }
        SectionChecks c = new SectionChecks();
        List<SweepDimension> dimensions = FamilyCatalogMapper.sweepList(c, path + ".dimensions", dto.dimensions());
        c.throwIfAny();
        return new GirderLibrarySection(new GirderLibrary(dto.enabled(), dimensions));
    }

    static PreferredSpanRulesSection toPreferredSpanRules(List<PreferredSpanRuleDto> dtos, String path) {
        if (dtos == null) {
            return new PreferredSpanRulesSection(null);
        }
        SectionChecks c = new SectionChecks();
        List<PreferredSpanRule> rules = c.list(path, dtos, (d, p) -> rule(c, p, d));
        c.throwIfAny();
        return new PreferredSpanRulesSection(rules);
    }

    static CrossSectionSection toCrossSection(CrossSectionDto dto, String path) {
        if (dto == null) {
            return new CrossSectionSection(null);
        }
        SectionChecks c = new SectionChecks();
        double platform = c.requiredFinite(path + ".platformWidthM", dto.platformWidthM());
        double left = c.requiredFinite(path + ".leftWalkwayM", dto.leftWalkwayM());
        double right = c.requiredFinite(path + ".rightWalkwayM", dto.rightWalkwayM());
        double space = c.requiredFinite(path + ".spaceOfGirderM", dto.spaceOfGirderM());
        double count = c.requiredFinite(path + ".numberOfGirders", dto.numberOfGirders());
        c.throwIfAny();
        return new CrossSectionSection(new CrossSectionValues(platform, left, right, space, count));
    }

    private static PreferredSpanRule rule(SectionChecks c, String p, PreferredSpanRuleDto d) {
        int before = c.count();
        String id = c.text(p + ".id", d.id());
        String type = c.text(p + ".superstructureType", d.superstructureType());
        String variant = c.text(p + ".girderVariantId", d.girderVariantId());
        double min = c.requiredFinite(p + ".minSpan", d.minSpan());
        double max = c.requiredFinite(p + ".maxSpan", d.maxSpan());
        double delta = c.requiredFinite(p + ".spanDelta", d.spanDelta());
        double primary = c.requiredFinite(p + ".primarySpan", d.primarySpan());
        if (d.enabled() == null) {
            c.add(p + ".enabled", "is required");
        }
        String source = c.text(p + ".source", d.source());
        if (c.count() > before) {
            return null;
        }
        return new PreferredSpanRule(id, type, variant, min, max, delta, primary, d.enabled(), source);
    }

    static GirderLibraryDto girderLibraryDto(GirderLibrary library) {
        return library == null ? null
                : new GirderLibraryDto(library.enabled(), FamilyCatalogMapper.sweepListDto(library.dimensions()));
    }

    static List<PreferredSpanRuleDto> preferredSpanRulesDto(List<PreferredSpanRule> rules) {
        return rules == null ? null : rules.stream().map(r -> new PreferredSpanRuleDto(r.id(),
                r.superstructureType(), r.girderVariantId(), r.minSpan(), r.maxSpan(), r.spanDelta(),
                r.primarySpan(), r.enabled(), r.source())).toList();
    }

    static CrossSectionDto crossSectionDto(CrossSectionValues v) {
        return v == null ? null : new CrossSectionDto(v.platformWidthM(), v.leftWalkwayM(), v.rightWalkwayM(),
                v.spaceOfGirderM(), v.numberOfGirders());
    }
}
