package com.kopruq.bridge.api;

import com.kopruq.bridge.enums.BridgeInventoryType;
import com.kopruq.bridge.enums.InventoryPierShape;
import com.kopruq.bridge.model.BridgeInventoryRow;
import com.kopruq.bridge.model.ProjectInfo;
import com.kopruq.bridge.model.ProjectWorkspace;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.validation.FieldChecks;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Converts the workspace JSON shape to the model and back. Only structure is checked (present, finite, known label,
 * non-blank and unique row id) and every problem is collected with its field path before one
 * {@code InvalidRequestException} is thrown. Text values are passed through untouched; no engineering rule, range or
 * default is applied.
 */
final class ProjectWorkspaceMapper {

    private static final String BRIDGE_TYPES = Arrays.stream(BridgeInventoryType.values())
            .map(BridgeInventoryType::label).collect(Collectors.joining(", "));
    private static final String PIER_SHAPES = Arrays.stream(InventoryPierShape.values())
            .map(InventoryPierShape::label).collect(Collectors.joining(", "));

    private ProjectWorkspaceMapper() {
    }

    /** Validates the DTO (violation paths start with {@code path}, e.g. {@code value}) and builds the model. */
    static ProjectWorkspace toModel(WorkspaceDto dto, String path) {
        List<FieldViolation> violations = new ArrayList<>();
        ProjectInfo info = null;
        List<BridgeInventoryRow> rows = new ArrayList<>();
        if (dto == null) {
            violations.add(new FieldViolation(path, "is required"));
        } else {
            info = toInfo(dto.project(), path + ".project", violations);
            if (dto.bridges() == null) {
                violations.add(new FieldViolation(path + ".bridges", "is required"));
            } else {
                Map<String, Integer> firstIndexOfId = new HashMap<>();
                for (int i = 0; i < dto.bridges().size(); i++) {
                    String rowPath = path + ".bridges[" + i + "]";
                    WorkspaceDto.BridgeRowDto row = dto.bridges().get(i);
                    if (row == null) {
                        violations.add(new FieldViolation(rowPath, "is required"));
                        continue;
                    }
                    BridgeInventoryRow converted = toRow(row, rowPath, violations);
                    if (row.id() != null && !row.id().isBlank()) {
                        Integer first = firstIndexOfId.putIfAbsent(row.id(), i);
                        if (first != null) {
                            violations.add(new FieldViolation(rowPath + ".id",
                                    "duplicates bridges[" + first + "].id"));
                        }
                    }
                    if (converted != null) {
                        rows.add(converted);
                    }
                }
            }
        }
        FieldChecks.throwIfAny(violations);
        return new ProjectWorkspace(info, rows);
    }

    static WorkspaceDto toDto(ProjectWorkspace workspace) {
        ProjectInfo p = workspace.project();
        WorkspaceDto.ProjectInfoDto info = new WorkspaceDto.ProjectInfoDto(
                p.name(), p.code(), p.client(), p.designer(), p.country(), p.region(), p.projectType(), p.status(),
                p.startDate(), p.targetDate(), p.description(), p.locationStart(), p.locationEnd(),
                p.coordinateSystem(), p.designStandardFamily(), p.concreteCode(), p.steelCode(), p.compositeCode(),
                p.seismicCode(), p.geotechnicalCode(), p.trafficLoadStandard(),
                new WorkspaceDto.UnitsDto(p.units().length(), p.units().force(), p.units().moment(),
                        p.units().stress(), p.units().mass(), p.units().temperature()),
                new WorkspaceDto.CoordinateDto(p.coordinate().name(), p.coordinate().epsg(),
                        p.coordinate().horizontalDatum(), p.coordinate().verticalDatum(), p.coordinate().originX(),
                        p.coordinate().originY(), p.coordinate().originZ(), p.coordinate().northAngle()),
                new WorkspaceDto.CriteriaDto(p.criteria().designLife(), p.criteria().reliabilityClass(),
                        p.criteria().exposure(), p.criteria().concreteClass(), p.criteria().cover(),
                        p.criteria().philosophy()),
                new WorkspaceDto.EnvironmentDto(p.environment().terrainDatasetId(),
                        p.environment().landXmlImportId()),
                p.lastModified());
        List<WorkspaceDto.BridgeRowDto> bridges = workspace.bridges().stream()
                .map(r -> new WorkspaceDto.BridgeRowDto(r.id(), r.no(), r.km(), r.crossingType(),
                        r.estimatedLengthM(), r.roadWidthM(), r.terrain(), r.status(), r.bridgeType().label(),
                        r.spansM(), r.girderDepthCm(), r.girderNote(), r.pierShape().label()))
                .toList();
        return new WorkspaceDto(info, bridges);
    }

    private static ProjectInfo toInfo(WorkspaceDto.ProjectInfoDto d, String path, List<FieldViolation> v) {
        if (d == null) {
            v.add(new FieldViolation(path, "is required"));
            return null;
        }
        int before = v.size();
        text(v, path + ".name", d.name());
        text(v, path + ".id", d.id());
        text(v, path + ".client", d.client());
        text(v, path + ".designer", d.designer());
        text(v, path + ".country", d.country());
        text(v, path + ".region", d.region());
        text(v, path + ".projectType", d.projectType());
        text(v, path + ".status", d.status());
        text(v, path + ".startDate", d.startDate());
        text(v, path + ".targetDate", d.targetDate());
        text(v, path + ".description", d.description());
        text(v, path + ".locationStart", d.locationStart());
        text(v, path + ".locationEnd", d.locationEnd());
        text(v, path + ".coordinateSystem", d.coordinateSystem());
        text(v, path + ".designStandardFamily", d.designStandardFamily());
        text(v, path + ".concreteCode", d.concreteCode());
        text(v, path + ".steelCode", d.steelCode());
        text(v, path + ".compositeCode", d.compositeCode());
        text(v, path + ".seismicCode", d.seismicCode());
        text(v, path + ".geotechnicalCode", d.geotechnicalCode());
        text(v, path + ".trafficLoadStandard", d.trafficLoadStandard());
        text(v, path + ".lastModified", d.lastModified());
        ProjectInfo.Units units = toUnits(d.units(), path + ".units", v);
        ProjectInfo.Coordinate coordinate = toCoordinate(d.coordinate(), path + ".coordinate", v);
        ProjectInfo.Criteria criteria = toCriteria(d.criteria(), path + ".criteria", v);
        ProjectInfo.Environment environment;
        if (d.environment() == null) {
            v.add(new FieldViolation(path + ".environment", "is required"));
            environment = null;
        } else {
            environment = new ProjectInfo.Environment(d.environment().terrainDatasetId(),
                    d.environment().landXmlImportId());
        }
        if (v.size() > before) {
            return null;
        }
        return new ProjectInfo(d.name(), d.id(), d.client(), d.designer(), d.country(), d.region(), d.projectType(),
                d.status(), d.startDate(), d.targetDate(), d.description(), d.locationStart(), d.locationEnd(),
                d.coordinateSystem(), d.designStandardFamily(), d.concreteCode(), d.steelCode(), d.compositeCode(),
                d.seismicCode(), d.geotechnicalCode(), d.trafficLoadStandard(), units, coordinate, criteria,
                environment, d.lastModified());
    }

    private static ProjectInfo.Units toUnits(WorkspaceDto.UnitsDto d, String path, List<FieldViolation> v) {
        if (d == null) {
            v.add(new FieldViolation(path, "is required"));
            return null;
        }
        text(v, path + ".length", d.length());
        text(v, path + ".force", d.force());
        text(v, path + ".moment", d.moment());
        text(v, path + ".stress", d.stress());
        text(v, path + ".mass", d.mass());
        text(v, path + ".temperature", d.temperature());
        if (hasNulls(d.length(), d.force(), d.moment(), d.stress(), d.mass(), d.temperature())) {
            return null;
        }
        return new ProjectInfo.Units(d.length(), d.force(), d.moment(), d.stress(), d.mass(), d.temperature());
    }

    private static ProjectInfo.Coordinate toCoordinate(WorkspaceDto.CoordinateDto d, String path,
            List<FieldViolation> v) {
        if (d == null) {
            v.add(new FieldViolation(path, "is required"));
            return null;
        }
        text(v, path + ".name", d.name());
        text(v, path + ".epsg", d.epsg());
        text(v, path + ".horizontalDatum", d.horizontalDatum());
        text(v, path + ".verticalDatum", d.verticalDatum());
        text(v, path + ".originX", d.originX());
        text(v, path + ".originY", d.originY());
        text(v, path + ".originZ", d.originZ());
        text(v, path + ".northAngle", d.northAngle());
        if (hasNulls(d.name(), d.epsg(), d.horizontalDatum(), d.verticalDatum(), d.originX(), d.originY(),
                d.originZ(), d.northAngle())) {
            return null;
        }
        return new ProjectInfo.Coordinate(d.name(), d.epsg(), d.horizontalDatum(), d.verticalDatum(), d.originX(),
                d.originY(), d.originZ(), d.northAngle());
    }

    private static ProjectInfo.Criteria toCriteria(WorkspaceDto.CriteriaDto d, String path, List<FieldViolation> v) {
        if (d == null) {
            v.add(new FieldViolation(path, "is required"));
            return null;
        }
        text(v, path + ".designLife", d.designLife());
        text(v, path + ".reliabilityClass", d.reliabilityClass());
        text(v, path + ".exposure", d.exposure());
        text(v, path + ".concreteClass", d.concreteClass());
        text(v, path + ".cover", d.cover());
        text(v, path + ".philosophy", d.philosophy());
        if (hasNulls(d.designLife(), d.reliabilityClass(), d.exposure(), d.concreteClass(), d.cover(),
                d.philosophy())) {
            return null;
        }
        return new ProjectInfo.Criteria(d.designLife(), d.reliabilityClass(), d.exposure(), d.concreteClass(),
                d.cover(), d.philosophy());
    }

    private static BridgeInventoryRow toRow(WorkspaceDto.BridgeRowDto d, String path, List<FieldViolation> v) {
        int before = v.size();
        if (d.id() == null) {
            v.add(new FieldViolation(path + ".id", "is required"));
        } else if (d.id().isBlank()) {
            v.add(new FieldViolation(path + ".id", "must not be blank"));
        }
        text(v, path + ".no", d.no());
        text(v, path + ".km", d.km());
        text(v, path + ".crossingType", d.crossingType());
        text(v, path + ".terrain", d.terrain());
        text(v, path + ".status", d.status());
        FieldChecks.requireFinite(v, path + ".estimatedLengthM", d.estimatedLengthM());
        FieldChecks.requireFinite(v, path + ".roadWidthM", d.roadWidthM());
        BridgeInventoryType bridgeType = null;
        if (d.bridgeType() == null) {
            v.add(new FieldViolation(path + ".bridgeType", "is required"));
        } else {
            bridgeType = BridgeInventoryType.fromLabel(d.bridgeType()).orElse(null);
            if (bridgeType == null) {
                v.add(new FieldViolation(path + ".bridgeType", "must be one of: " + BRIDGE_TYPES));
            }
        }
        InventoryPierShape pierShape = null;
        if (d.pierShape() == null) {
            v.add(new FieldViolation(path + ".pierShape", "is required"));
        } else {
            pierShape = InventoryPierShape.fromLabel(d.pierShape()).orElse(null);
            if (pierShape == null) {
                v.add(new FieldViolation(path + ".pierShape", "must be one of: " + PIER_SHAPES));
            }
        }
        if (d.spansM() == null) {
            v.add(new FieldViolation(path + ".spansM", "is required"));
        } else {
            numbers(v, path + ".spansM", d.spansM());
        }
        if (d.girderDepthCm() != null) {
            numbers(v, path + ".girderDepthCm", d.girderDepthCm());
        }
        if (v.size() > before) {
            return null;
        }
        return new BridgeInventoryRow(d.id(), d.no(), d.km(), d.crossingType(), d.estimatedLengthM(),
                d.roadWidthM(), d.terrain(), d.status(), bridgeType, d.spansM(), d.girderDepthCm(), d.girderNote(),
                pierShape);
    }

    private static void numbers(List<FieldViolation> v, String path, List<Double> values) {
        for (int i = 0; i < values.size(); i++) {
            FieldChecks.requireFinite(v, path + "[" + i + "]", values.get(i));
        }
    }

    private static void text(List<FieldViolation> v, String path, String value) {
        FieldChecks.requireNonNull(v, path, value);
    }

    private static boolean hasNulls(Object... values) {
        for (Object value : values) {
            if (value == null) {
                return true;
            }
        }
        return false;
    }
}
