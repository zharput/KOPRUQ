package com.kopruq.bridge.api;

import com.kopruq.bridge.enums.BridgeAxisType;
import com.kopruq.bridge.enums.ConstraintKind;
import com.kopruq.bridge.model.AxisFamilyAssignment;
import com.kopruq.bridge.model.BridgeAxis;
import com.kopruq.bridge.model.BridgeConstraint;
import com.kopruq.bridge.model.BridgeDefinition;
import com.kopruq.bridge.model.BridgeDefinitions;

import java.util.ArrayList;
import java.util.List;

/**
 * Converts the bridge definitions JSON shape to the model and back. Only structure is checked (present, finite,
 * known enum constant, non-blank and unique {@code definitionKey} / {@code axisId}); values pass through untouched.
 * {@code definitionKey} and {@code bridgeId} are independent here (the frontend store keys by the bridge id, but no
 * rule is enforced).
 */
final class BridgeDefinitionsMapper {

    private BridgeDefinitionsMapper() {
    }

    static BridgeDefinitions toModel(BridgeDefinitionsDto dto, String path) {
        SectionChecks c = new SectionChecks();
        List<BridgeDefinition> items = List.of();
        if (dto == null) {
            c.add(path, "is required");
        } else if (dto.definitions() == null) {
            c.add(path + ".definitions", "is required");
        } else {
            String listPath = path + ".definitions";
            c.unique(listPath, dto.definitions(), BridgeDefinitionsDto.DefinitionDto::definitionKey,
                    "definitionKey");
            items = c.list(listPath, dto.definitions(), (d, p) -> definition(c, p, d));
        }
        c.throwIfAny();
        return new BridgeDefinitions(items);
    }

    private static BridgeDefinition definition(SectionChecks c, String p, BridgeDefinitionsDto.DefinitionDto d) {
        int before = c.count();
        c.id(p + ".definitionKey", d.definitionKey());
        String bridgeId = c.text(p + ".bridgeId", d.bridgeId());
        List<Double> spans = new ArrayList<>();
        if (d.spanLengthsM() == null) {
            c.add(p + ".spanLengthsM", "is required");
        } else {
            for (int i = 0; i < d.spanLengthsM().size(); i++) {
                String sp = p + ".spanLengthsM[" + i + "]";
                spans.add(c.requiredFinite(sp, d.spanLengthsM().get(i)));
            }
        }
        List<BridgeAxis> axes = d.axes() == null ? missing(c, p + ".axes")
                : c.list(p + ".axes", d.axes(), (a, ap) -> axis(c, ap, a));
        String superstructureType = c.text(p + ".superstructureType", d.superstructureType());
        Double girderCount = c.optionalFinite(p + ".girderCount", d.girderCount());
        Double deckWidth = c.optionalFinite(p + ".deckWidthOverrideM", d.deckWidthOverrideM());
        List<AxisFamilyAssignment> assignments;
        if (d.axisAssignments() == null) {
            assignments = missing(c, p + ".axisAssignments");
        } else {
            c.unique(p + ".axisAssignments", d.axisAssignments(), BridgeDefinitionsDto.AssignmentDto::axisId,
                    "axisId");
            assignments = c.list(p + ".axisAssignments", d.axisAssignments(), (a, ap) -> assignment(c, ap, a));
        }
        String a1 = null;
        String a2 = null;
        if (d.abutmentFamilyIds() == null) {
            c.add(p + ".abutmentFamilyIds", "is required");
        } else {
            a1 = d.abutmentFamilyIds().a1();
            a2 = d.abutmentFamilyIds().a2();
        }
        String method = c.text(p + ".constructionMethod", d.constructionMethod());
        String stages = c.text(p + ".constructionStagesNote", d.constructionStagesNote());
        List<BridgeConstraint> constraints = d.constraints() == null ? missing(c, p + ".constraints")
                : c.list(p + ".constraints", d.constraints(), (k, kp) -> constraint(c, kp, k));
        if (c.count() > before) {
            return null;
        }
        return new BridgeDefinition(d.definitionKey(), bridgeId, spans, axes, superstructureType,
                d.girderFamilyId(), d.girderVariantId(), girderCount, deckWidth, assignments, a1, a2, method, stages,
                constraints);
    }

    private static <T> List<T> missing(SectionChecks c, String path) {
        c.add(path, "is required");
        return List.of();
    }

    private static BridgeAxis axis(SectionChecks c, String p, BridgeDefinitionsDto.AxisDto d) {
        int before = c.count();
        String id = c.text(p + ".id", d.id());
        String name = c.text(p + ".name", d.name());
        BridgeAxisType type = c.requiredEnum(p + ".type", d.type(), BridgeAxisType.class);
        double chainage = c.requiredFinite(p + ".chainageM", d.chainageM());
        Double elevation = c.optionalFinite(p + ".elevationM", d.elevationM());
        Double skew = c.optionalFinite(p + ".skewDegrees", d.skewDegrees());
        return c.count() > before ? null : new BridgeAxis(id, name, type, chainage, elevation, skew);
    }

    private static AxisFamilyAssignment assignment(SectionChecks c, String p,
            BridgeDefinitionsDto.AssignmentDto d) {
        int before = c.count();
        c.id(p + ".axisId", d.axisId());
        Double pierHeight = c.optionalFinite(p + ".pierHeightM", d.pierHeightM());
        Double foundationElevation = c.optionalFinite(p + ".foundationElevationM", d.foundationElevationM());
        Double bearingQuantity = c.optionalFinite(p + ".bearingQuantity", d.bearingQuantity());
        String soil = c.text(p + ".soilReference", d.soilReference());
        String orientation = c.text(p + ".bearingOrientation", d.bearingOrientation());
        String longitudinal = c.text(p + ".longitudinalBehavior", d.longitudinalBehavior());
        String transverse = c.text(p + ".transverseBehavior", d.transverseBehavior());
        if (c.count() > before) {
            return null;
        }
        return new AxisFamilyAssignment(d.axisId(), d.pierFamilyId(), pierHeight, d.pierCapFamilyId(),
                d.foundationFamilyId(), foundationElevation, soil, d.bearingFamilyId(), bearingQuantity, orientation,
                longitudinal, transverse);
    }

    private static BridgeConstraint constraint(SectionChecks c, String p, BridgeDefinitionsDto.ConstraintDto d) {
        int before = c.count();
        String id = c.text(p + ".id", d.id());
        ConstraintKind kind = c.requiredEnum(p + ".kind", d.kind(), ConstraintKind.class);
        String name = c.text(p + ".name", d.name());
        Double start = c.optionalFinite(p + ".startChainageM", d.startChainageM());
        Double end = c.optionalFinite(p + ".endChainageM", d.endChainageM());
        String note = c.text(p + ".note", d.note());
        return c.count() > before ? null : new BridgeConstraint(id, kind, name, start, end, note);
    }

    static BridgeDefinitionsDto toDto(BridgeDefinitions section) {
        if (section == null) {
            return null;
        }
        return new BridgeDefinitionsDto(section.definitions().stream().map(d -> new BridgeDefinitionsDto.DefinitionDto(
                d.definitionKey(), d.bridgeId(), d.spanLengthsM(),
                d.axes().stream().map(a -> new BridgeDefinitionsDto.AxisDto(a.id(), a.name(), a.type().name(),
                        a.chainageM(), a.elevationM(), a.skewDegrees())).toList(),
                d.superstructureType(), d.girderFamilyId(), d.girderVariantId(), d.girderCount(),
                d.deckWidthOverrideM(),
                d.axisAssignments().stream().map(a -> new BridgeDefinitionsDto.AssignmentDto(a.axisId(),
                        a.pierFamilyId(), a.pierHeightM(), a.pierCapFamilyId(), a.foundationFamilyId(),
                        a.foundationElevationM(), a.soilReference(), a.bearingFamilyId(), a.bearingQuantity(),
                        a.bearingOrientation(), a.longitudinalBehavior(), a.transverseBehavior())).toList(),
                new BridgeDefinitionsDto.AbutmentFamilyIdsDto(d.abutmentA1FamilyId(), d.abutmentA2FamilyId()),
                d.constructionMethod(), d.constructionStagesNote(),
                d.constraints().stream().map(k -> new BridgeDefinitionsDto.ConstraintDto(k.id(), k.kind().name(),
                        k.name(), k.startChainageM(), k.endChainageM(), k.note())).toList()))
                .toList());
    }
}
