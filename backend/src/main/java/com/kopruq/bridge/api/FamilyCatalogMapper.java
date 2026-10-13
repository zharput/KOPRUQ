package com.kopruq.bridge.api;

import com.kopruq.bridge.enums.BearingFamilyType;
import com.kopruq.bridge.enums.FoundationFamilyType;
import com.kopruq.bridge.enums.PierCapConfiguration;
import com.kopruq.bridge.enums.PierCapType;
import com.kopruq.bridge.enums.PierFamilyType;
import com.kopruq.bridge.model.BearingFamily;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.FoundationFamily;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.MaterialAssignment;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamily;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamily;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.RangeRule;
import com.kopruq.bridge.model.SweepDimension;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Converts the five family catalog JSON shapes to the model and back. A catalog is a required list (an empty list is a
 * valid empty catalog); every field except the id is optional. Values pass through untouched.
 */
final class FamilyCatalogMapper {

    private FamilyCatalogMapper() {
    }

    // ------------------------------------------------------------------ request -> model

    static PierFamilyCatalog toPiers(List<FamilyDtos.PierFamilyDto> dtos, String path) {
        SectionChecks c = new SectionChecks();
        List<PierFamily> items = catalog(c, dtos, path, FamilyDtos.PierFamilyDto::id, FamilyCatalogMapper::pier);
        c.throwIfAny();
        return new PierFamilyCatalog(items);
    }

    static PierCapFamilyCatalog toPierCaps(List<FamilyDtos.PierCapFamilyDto> dtos, String path) {
        SectionChecks c = new SectionChecks();
        List<PierCapFamily> items = catalog(c, dtos, path, FamilyDtos.PierCapFamilyDto::id,
                FamilyCatalogMapper::pierCap);
        c.throwIfAny();
        return new PierCapFamilyCatalog(items);
    }

    static FoundationFamilyCatalog toFoundations(List<FamilyDtos.FoundationFamilyDto> dtos, String path) {
        SectionChecks c = new SectionChecks();
        List<FoundationFamily> items = catalog(c, dtos, path, FamilyDtos.FoundationFamilyDto::id,
                FamilyCatalogMapper::foundation);
        c.throwIfAny();
        return new FoundationFamilyCatalog(items);
    }

    static BearingFamilyCatalog toBearings(List<FamilyDtos.BearingFamilyDto> dtos, String path) {
        SectionChecks c = new SectionChecks();
        List<BearingFamily> items = catalog(c, dtos, path, FamilyDtos.BearingFamilyDto::id,
                FamilyCatalogMapper::bearing);
        c.throwIfAny();
        return new BearingFamilyCatalog(items);
    }

    static MaterialAssignmentCatalog toMaterials(List<FamilyDtos.MaterialAssignmentDto> dtos, String path) {
        SectionChecks c = new SectionChecks();
        List<MaterialAssignment> items = catalog(c, dtos, path, FamilyDtos.MaterialAssignmentDto::id,
                FamilyCatalogMapper::material);
        c.throwIfAny();
        return new MaterialAssignmentCatalog(items);
    }

    private static <D, M> List<M> catalog(SectionChecks c, List<D> dtos, String path, Function<D, String> id,
            Converter<D, M> convert) {
        if (dtos == null) {
            c.add(path, "is required");
            return List.of();
        }
        c.unique(path, dtos, id, "id");
        return c.list(path, dtos, (d, p) -> convert.apply(d, p, c));
    }

    @FunctionalInterface
    private interface Converter<D, M> {
        M apply(D dto, String path, SectionChecks checks);
    }

    private static PierFamily pier(FamilyDtos.PierFamilyDto d, String p, SectionChecks c) {
        int before = c.count();
        c.id(p + ".id", d.id());
        PierFamilyType type = c.optionalEnum(p + ".pierType", d.pierType(), PierFamilyType.class);
        List<SweepDimension> dimensions = sweepList(c, p + ".dimensions", d.dimensions());
        List<String> configurations = null;
        if (d.allowedConfigurations() != null) {
            configurations = new ArrayList<>();
            for (int i = 0; i < d.allowedConfigurations().size(); i++) {
                String value = c.text(p + ".allowedConfigurations[" + i + "]", d.allowedConfigurations().get(i));
                if (value != null) {
                    configurations.add(value);
                }
            }
        }
        SweepDimension spacing = sweep(c, p + ".twoColumnSpacing", d.twoColumnSpacing());
        PierFamily.HeightApplicability height = null;
        FamilyDtos.HeightApplicabilityDto h = d.heightApplicability();
        if (h != null) {
            height = new PierFamily.HeightApplicability(
                    c.optionalFinite(p + ".heightApplicability.minimumHeight", h.minimumHeight()),
                    c.optionalFinite(p + ".heightApplicability.preferredHeightMin", h.preferredHeightMin()),
                    c.optionalFinite(p + ".heightApplicability.preferredHeightMax", h.preferredHeightMax()),
                    c.optionalFinite(p + ".heightApplicability.maximumHeight", h.maximumHeight()));
        }
        if (c.count() > before) {
            return null;
        }
        return new PierFamily(d.id(), d.name(), type, d.enabled(), dimensions, configurations, spacing, height,
                d.source());
    }

    private static PierCapFamily pierCap(FamilyDtos.PierCapFamilyDto d, String p, SectionChecks c) {
        int before = c.count();
        c.id(p + ".id", d.id());
        PierCapType type = c.optionalEnum(p + ".capType", d.capType(), PierCapType.class);
        PierCapConfiguration configuration = c.optionalEnum(p + ".compatiblePierConfiguration",
                d.compatiblePierConfiguration(), PierCapConfiguration.class);
        RangeRule length = rule(c, p + ".capTransverseLength", d.capTransverseLength());
        RangeRule height = rule(c, p + ".capStructuralHeight", d.capStructuralHeight());
        RangeRule stem = rule(c, p + ".stemWidth", d.stemWidth());
        if (c.count() > before) {
            return null;
        }
        return new PierCapFamily(d.id(), d.name(), type, configuration, length, height, stem, d.enabled(),
                d.source());
    }

    private static FoundationFamily foundation(FamilyDtos.FoundationFamilyDto d, String p, SectionChecks c) {
        int before = c.count();
        c.id(p + ".id", d.id());
        FoundationFamilyType type = c.optionalEnum(p + ".foundationType", d.foundationType(),
                FoundationFamilyType.class);
        FoundationFamily.ShallowGeneration shallow = null;
        if (d.shallowGeneration() != null) {
            String sp = p + ".shallowGeneration";
            FamilyDtos.ShallowGenerationDto s = d.shallowGeneration();
            RangeRule lengthX = requiredRule(c, sp + ".lengthX", s.lengthX());
            RangeRule lengthY = requiredRule(c, sp + ".lengthY", s.lengthY());
            RangeRule height = requiredRule(c, sp + ".height", s.height());
            if (lengthX != null && lengthY != null && height != null) {
                shallow = new FoundationFamily.ShallowGeneration(lengthX, lengthY, height);
            }
        }
        FoundationFamily.PiledGeneration piled = null;
        if (d.piledGeneration() != null) {
            String pp = p + ".piledGeneration";
            FamilyDtos.PiledGenerationDto g = d.piledGeneration();
            RangeRule diameter = requiredRule(c, pp + ".pileDiameter", g.pileDiameter());
            RangeRule countX = requiredRule(c, pp + ".pileCountX", g.pileCountX());
            RangeRule spacingX = requiredRule(c, pp + ".pileSpacingX", g.pileSpacingX());
            RangeRule countY = requiredRule(c, pp + ".pileCountY", g.pileCountY());
            RangeRule spacingY = requiredRule(c, pp + ".pileSpacingY", g.pileSpacingY());
            RangeRule height = requiredRule(c, pp + ".height", g.height());
            if (diameter != null && countX != null && spacingX != null && countY != null && spacingY != null
                    && height != null) {
                piled = new FoundationFamily.PiledGeneration(diameter, countX, spacingX, countY, spacingY, height);
            }
        }
        if (c.count() > before) {
            return null;
        }
        return new FoundationFamily(d.id(), d.name(), type, d.enabled(), shallow, piled, d.source());
    }

    private static BearingFamily bearing(FamilyDtos.BearingFamilyDto d, String p, SectionChecks c) {
        int before = c.count();
        c.id(p + ".id", d.id());
        BearingFamilyType type = c.optionalEnum(p + ".bearingType", d.bearingType(), BearingFamilyType.class);
        RangeRule length = rule(c, p + ".length", d.length());
        RangeRule width = rule(c, p + ".width", d.width());
        RangeRule height = rule(c, p + ".height", d.height());
        if (c.count() > before) {
            return null;
        }
        return new BearingFamily(d.id(), d.name(), type, d.enabled(), length, width, height, d.source());
    }

    private static MaterialAssignment material(FamilyDtos.MaterialAssignmentDto d, String p, SectionChecks c) {
        int before = c.count();
        c.id(p + ".id", d.id());
        c.optionalFinite(p + ".no", d.no());
        if (c.count() > before) {
            return null;
        }
        return new MaterialAssignment(d.id(), d.no(), d.element(), d.concreteClass());
    }

    private static RangeRule rule(SectionChecks c, String path, FamilyDtos.RangeRuleDto d) {
        if (d == null) {
            return null;
        }
        int before = c.count();
        Double min = c.optionalFinite(path + ".min", d.min());
        Double max = c.optionalFinite(path + ".max", d.max());
        Double delta = c.optionalFinite(path + ".delta", d.delta());
        return c.count() > before ? null : new RangeRule(min, max, delta);
    }

    private static RangeRule requiredRule(SectionChecks c, String path, FamilyDtos.RangeRuleDto d) {
        if (d == null) {
            c.add(path, "is required");
            return null;
        }
        return rule(c, path, d);
    }

    static SweepDimension sweep(SectionChecks c, String path, FamilyDtos.SweepDimensionDto d) {
        if (d == null) {
            return null;
        }
        int before = c.count();
        String key = c.text(path + ".key", d.key());
        String label = c.text(path + ".label", d.label());
        double min = c.requiredFinite(path + ".min", d.min());
        double max = c.requiredFinite(path + ".max", d.max());
        double delta = c.requiredFinite(path + ".delta", d.delta());
        return c.count() > before ? null : new SweepDimension(key, label, min, max, delta);
    }

    /** A null list stays null (absent); null elements are violations. */
    static List<SweepDimension> sweepList(SectionChecks c, String path, List<FamilyDtos.SweepDimensionDto> dtos) {
        if (dtos == null) {
            return null;
        }
        return c.list(path, dtos, (d, p) -> sweep(c, p, d));
    }

    // ------------------------------------------------------------------ model -> response

    static List<FamilyDtos.PierFamilyDto> piersDto(PierFamilyCatalog catalog) {
        return catalog == null ? null : catalog.families().stream().map(f -> new FamilyDtos.PierFamilyDto(f.id(),
                f.name(), name(f.pierType()), f.enabled(), f.source(), sweepListDto(f.dimensions()),
                f.allowedConfigurations(), sweepDto(f.twoColumnSpacing()),
                f.heightApplicability() == null ? null
                        : new FamilyDtos.HeightApplicabilityDto(f.heightApplicability().minimumHeight(),
                                f.heightApplicability().preferredHeightMin(),
                                f.heightApplicability().preferredHeightMax(),
                                f.heightApplicability().maximumHeight())))
                .toList();
    }

    static List<FamilyDtos.PierCapFamilyDto> pierCapsDto(PierCapFamilyCatalog catalog) {
        return catalog == null ? null : catalog.families().stream().map(f -> new FamilyDtos.PierCapFamilyDto(f.id(),
                f.name(), name(f.capType()), name(f.compatiblePierConfiguration()), f.enabled(), f.source(),
                ruleDto(f.capTransverseLength()), ruleDto(f.capStructuralHeight()), ruleDto(f.stemWidth())))
                .toList();
    }

    static List<FamilyDtos.FoundationFamilyDto> foundationsDto(FoundationFamilyCatalog catalog) {
        return catalog == null ? null : catalog.families().stream().map(f -> new FamilyDtos.FoundationFamilyDto(
                f.id(), f.name(), name(f.foundationType()), f.enabled(), f.source(),
                f.shallowGeneration() == null ? null
                        : new FamilyDtos.ShallowGenerationDto(ruleDto(f.shallowGeneration().lengthX()),
                                ruleDto(f.shallowGeneration().lengthY()), ruleDto(f.shallowGeneration().height())),
                f.piledGeneration() == null ? null
                        : new FamilyDtos.PiledGenerationDto(ruleDto(f.piledGeneration().pileDiameter()),
                                ruleDto(f.piledGeneration().pileCountX()), ruleDto(f.piledGeneration().pileSpacingX()),
                                ruleDto(f.piledGeneration().pileCountY()), ruleDto(f.piledGeneration().pileSpacingY()),
                                ruleDto(f.piledGeneration().height()))))
                .toList();
    }

    static List<FamilyDtos.BearingFamilyDto> bearingsDto(BearingFamilyCatalog catalog) {
        return catalog == null ? null : catalog.families().stream().map(f -> new FamilyDtos.BearingFamilyDto(f.id(),
                f.name(), name(f.bearingType()), f.enabled(), f.source(), ruleDto(f.length()), ruleDto(f.width()),
                ruleDto(f.height()))).toList();
    }

    static List<FamilyDtos.MaterialAssignmentDto> materialsDto(MaterialAssignmentCatalog catalog) {
        return catalog == null ? null : catalog.assignments().stream().map(m -> new FamilyDtos.MaterialAssignmentDto(
                m.id(), m.no(), m.element(), m.concreteClass())).toList();
    }

    static FamilyDtos.SweepDimensionDto sweepDto(SweepDimension d) {
        return d == null ? null : new FamilyDtos.SweepDimensionDto(d.key(), d.label(), d.min(), d.max(), d.delta());
    }

    static List<FamilyDtos.SweepDimensionDto> sweepListDto(List<SweepDimension> list) {
        return list == null ? null : list.stream().map(FamilyCatalogMapper::sweepDto).toList();
    }

    private static FamilyDtos.RangeRuleDto ruleDto(RangeRule r) {
        return r == null ? null : new FamilyDtos.RangeRuleDto(r.min(), r.max(), r.delta());
    }

    private static String name(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
