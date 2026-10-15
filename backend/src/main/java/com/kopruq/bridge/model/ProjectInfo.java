package com.kopruq.bridge.model;

import java.util.Objects;

/**
 * The project information form as entered. Every value is kept as given (an empty string is valid); nothing is
 * parsed, converted or defaulted. {@code code} is the user-visible project id of the form (not the storage UUID).
 * The name is also kept as {@code project.project_name} by the persistence layer.
 */
public record ProjectInfo(
        String name,
        String code,
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
        Units units,
        Coordinate coordinate,
        Criteria criteria,
        Environment environment,
        String lastModified) {

    public ProjectInfo {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(client, "client");
        Objects.requireNonNull(designer, "designer");
        Objects.requireNonNull(country, "country");
        Objects.requireNonNull(region, "region");
        Objects.requireNonNull(projectType, "projectType");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(startDate, "startDate");
        Objects.requireNonNull(targetDate, "targetDate");
        Objects.requireNonNull(description, "description");
        Objects.requireNonNull(locationStart, "locationStart");
        Objects.requireNonNull(locationEnd, "locationEnd");
        Objects.requireNonNull(coordinateSystem, "coordinateSystem");
        Objects.requireNonNull(designStandardFamily, "designStandardFamily");
        Objects.requireNonNull(concreteCode, "concreteCode");
        Objects.requireNonNull(steelCode, "steelCode");
        Objects.requireNonNull(compositeCode, "compositeCode");
        Objects.requireNonNull(seismicCode, "seismicCode");
        Objects.requireNonNull(geotechnicalCode, "geotechnicalCode");
        Objects.requireNonNull(trafficLoadStandard, "trafficLoadStandard");
        Objects.requireNonNull(units, "units");
        Objects.requireNonNull(coordinate, "coordinate");
        Objects.requireNonNull(criteria, "criteria");
        Objects.requireNonNull(environment, "environment");
        Objects.requireNonNull(lastModified, "lastModified");
    }

    /**
     * Unit labels as entered (not interpreted or converted). They are display preferences only: load inputs are
     * stored in canonical SI (kN, m, kN/m, kN/m2, kN/m3, degrees Celsius) regardless of these values.
     */
    public record Units(String length, String force, String moment, String stress, String mass, String temperature) {
        public Units {
            Objects.requireNonNull(length, "length");
            Objects.requireNonNull(force, "force");
            Objects.requireNonNull(moment, "moment");
            Objects.requireNonNull(stress, "stress");
            Objects.requireNonNull(mass, "mass");
            Objects.requireNonNull(temperature, "temperature");
        }
    }

    /** Coordinate system fields as entered text. */
    public record Coordinate(String name, String epsg, String horizontalDatum, String verticalDatum, String originX,
            String originY, String originZ, String northAngle) {
        public Coordinate {
            Objects.requireNonNull(name, "name");
            Objects.requireNonNull(epsg, "epsg");
            Objects.requireNonNull(horizontalDatum, "horizontalDatum");
            Objects.requireNonNull(verticalDatum, "verticalDatum");
            Objects.requireNonNull(originX, "originX");
            Objects.requireNonNull(originY, "originY");
            Objects.requireNonNull(originZ, "originZ");
            Objects.requireNonNull(northAngle, "northAngle");
        }
    }

    /** Design criteria fields as entered text. */
    public record Criteria(String designLife, String reliabilityClass, String exposure, String concreteClass,
            String cover, String philosophy) {
        public Criteria {
            Objects.requireNonNull(designLife, "designLife");
            Objects.requireNonNull(reliabilityClass, "reliabilityClass");
            Objects.requireNonNull(exposure, "exposure");
            Objects.requireNonNull(concreteClass, "concreteClass");
            Objects.requireNonNull(cover, "cover");
            Objects.requireNonNull(philosophy, "philosophy");
        }
    }

    /** Links to the terrain / LandXML datasets the project works with; both optional. */
    public record Environment(String terrainDatasetId, String landXmlImportId) {
    }
}
