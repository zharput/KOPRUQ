package com.kopruq.bridge.api;

import java.util.List;

/**
 * JSON shape of a project workspace (project information plus bridge inventory). Fields are boxed so that a missing
 * field stays null and is reported by {@link ProjectWorkspaceMapper} instead of silently becoming 0. The shape follows
 * the frontend {@code ProjectWorkspaceData} / {@code BridgeRow} types: {@code project.id} is the user-visible project
 * code, bridge types and pier shapes are the display labels.
 */
public record WorkspaceDto(ProjectInfoDto project, List<BridgeRowDto> bridges) {

    public record ProjectInfoDto(
            String name,
            String id,
            String client,
            String designer,
            String country,
            String region,
            String projectType,
            String status,
            String startDate,
            String targetDate,
            String description,
            String locationStart,
            String locationEnd,
            String coordinateSystem,
            String designStandardFamily,
            String concreteCode,
            String steelCode,
            String compositeCode,
            String seismicCode,
            String geotechnicalCode,
            String trafficLoadStandard,
            UnitsDto units,
            CoordinateDto coordinate,
            CriteriaDto criteria,
            EnvironmentDto environment,
            String lastModified) {
    }

    public record UnitsDto(String length, String force, String moment, String stress, String mass,
            String temperature) {
    }

    public record CoordinateDto(String name, String epsg, String horizontalDatum, String verticalDatum,
            String originX, String originY, String originZ, String northAngle) {
    }

    public record CriteriaDto(String designLife, String reliabilityClass, String exposure, String concreteClass,
            String cover, String philosophy) {
    }

    public record EnvironmentDto(String terrainDatasetId, String landXmlImportId) {
    }

    public record BridgeRowDto(
            String id,
            String no,
            String km,
            String crossingType,
            Double estimatedLengthM,
            Double roadWidthM,
            String terrain,
            String status,
            String bridgeType,
            List<Double> spansM,
            List<Double> girderDepthCm,
            String girderNote,
            String pierShape) {
    }
}
