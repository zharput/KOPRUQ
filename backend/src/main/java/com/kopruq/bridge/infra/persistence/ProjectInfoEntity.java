package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.ProjectInfo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Persistent form of {@link ProjectInfo}: one row per project (0..1). There is deliberately no JPA relation to the
 * project (the foreign key exists in the database only). The project name is not stored here but in
 * {@code project.project_name}, so it has one home.
 */
@Entity
@Table(name = "project_info")
class ProjectInfoEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "project_code", nullable = false)
    private String code;

    @Column(name = "client", nullable = false)
    private String client;

    @Column(name = "designer", nullable = false)
    private String designer;

    @Column(name = "country", nullable = false)
    private String country;

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "project_type", nullable = false)
    private String projectType;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "start_date", nullable = false)
    private String startDate;

    @Column(name = "target_date", nullable = false)
    private String targetDate;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "location_start", nullable = false)
    private String locationStart;

    @Column(name = "location_end", nullable = false)
    private String locationEnd;

    @Column(name = "coordinate_system", nullable = false)
    private String coordinateSystem;

    @Column(name = "design_standard_family", nullable = false)
    private String designStandardFamily;

    @Column(name = "concrete_code", nullable = false)
    private String concreteCode;

    @Column(name = "steel_code", nullable = false)
    private String steelCode;

    @Column(name = "composite_code", nullable = false)
    private String compositeCode;

    @Column(name = "seismic_code", nullable = false)
    private String seismicCode;

    @Column(name = "geotechnical_code", nullable = false)
    private String geotechnicalCode;

    @Column(name = "traffic_load_standard", nullable = false)
    private String trafficLoadStandard;

    @Column(name = "unit_length", nullable = false)
    private String unitLength;

    @Column(name = "unit_force", nullable = false)
    private String unitForce;

    @Column(name = "unit_moment", nullable = false)
    private String unitMoment;

    @Column(name = "unit_stress", nullable = false)
    private String unitStress;

    @Column(name = "unit_mass", nullable = false)
    private String unitMass;

    @Column(name = "unit_temperature", nullable = false)
    private String unitTemperature;

    @Column(name = "coordinate_name", nullable = false)
    private String coordinateName;

    @Column(name = "coordinate_epsg", nullable = false)
    private String coordinateEpsg;

    @Column(name = "coordinate_horizontal_datum", nullable = false)
    private String coordinateHorizontalDatum;

    @Column(name = "coordinate_vertical_datum", nullable = false)
    private String coordinateVerticalDatum;

    @Column(name = "coordinate_origin_x", nullable = false)
    private String coordinateOriginX;

    @Column(name = "coordinate_origin_y", nullable = false)
    private String coordinateOriginY;

    @Column(name = "coordinate_origin_z", nullable = false)
    private String coordinateOriginZ;

    @Column(name = "coordinate_north_angle", nullable = false)
    private String coordinateNorthAngle;

    @Column(name = "criteria_design_life", nullable = false)
    private String criteriaDesignLife;

    @Column(name = "criteria_reliability_class", nullable = false)
    private String criteriaReliabilityClass;

    @Column(name = "criteria_exposure", nullable = false)
    private String criteriaExposure;

    @Column(name = "criteria_concrete_class", nullable = false)
    private String criteriaConcreteClass;

    @Column(name = "criteria_cover", nullable = false)
    private String criteriaCover;

    @Column(name = "criteria_philosophy", nullable = false)
    private String criteriaPhilosophy;

    @Column(name = "environment_terrain_dataset_id")
    private String environmentTerrainDatasetId;

    @Column(name = "environment_land_xml_import_id")
    private String environmentLandXmlImportId;

    @Column(name = "last_modified", nullable = false)
    private String lastModified;

    protected ProjectInfoEntity() {
    }

    ProjectInfoEntity(UUID projectId) {
        this.projectId = projectId;
    }

    void apply(ProjectInfo info) {
        this.code = info.code();
        this.client = info.client();
        this.designer = info.designer();
        this.country = info.country();
        this.region = info.region();
        this.projectType = info.projectType();
        this.status = info.status();
        this.startDate = info.startDate();
        this.targetDate = info.targetDate();
        this.description = info.description();
        this.locationStart = info.locationStart();
        this.locationEnd = info.locationEnd();
        this.coordinateSystem = info.coordinateSystem();
        this.designStandardFamily = info.designStandardFamily();
        this.concreteCode = info.concreteCode();
        this.steelCode = info.steelCode();
        this.compositeCode = info.compositeCode();
        this.seismicCode = info.seismicCode();
        this.geotechnicalCode = info.geotechnicalCode();
        this.trafficLoadStandard = info.trafficLoadStandard();
        this.unitLength = info.units().length();
        this.unitForce = info.units().force();
        this.unitMoment = info.units().moment();
        this.unitStress = info.units().stress();
        this.unitMass = info.units().mass();
        this.unitTemperature = info.units().temperature();
        this.coordinateName = info.coordinate().name();
        this.coordinateEpsg = info.coordinate().epsg();
        this.coordinateHorizontalDatum = info.coordinate().horizontalDatum();
        this.coordinateVerticalDatum = info.coordinate().verticalDatum();
        this.coordinateOriginX = info.coordinate().originX();
        this.coordinateOriginY = info.coordinate().originY();
        this.coordinateOriginZ = info.coordinate().originZ();
        this.coordinateNorthAngle = info.coordinate().northAngle();
        this.criteriaDesignLife = info.criteria().designLife();
        this.criteriaReliabilityClass = info.criteria().reliabilityClass();
        this.criteriaExposure = info.criteria().exposure();
        this.criteriaConcreteClass = info.criteria().concreteClass();
        this.criteriaCover = info.criteria().cover();
        this.criteriaPhilosophy = info.criteria().philosophy();
        this.environmentTerrainDatasetId = info.environment().terrainDatasetId();
        this.environmentLandXmlImportId = info.environment().landXmlImportId();
        this.lastModified = info.lastModified();
    }

    ProjectInfo toDomain(String projectName) {
        return new ProjectInfo(
                projectName,
                code,
                client,
                designer,
                country,
                region,
                projectType,
                status,
                startDate,
                targetDate,
                description,
                locationStart,
                locationEnd,
                coordinateSystem,
                designStandardFamily,
                concreteCode,
                steelCode,
                compositeCode,
                seismicCode,
                geotechnicalCode,
                trafficLoadStandard,
                new ProjectInfo.Units(unitLength, unitForce, unitMoment, unitStress, unitMass, unitTemperature),
                new ProjectInfo.Coordinate(coordinateName, coordinateEpsg, coordinateHorizontalDatum, coordinateVerticalDatum, coordinateOriginX, coordinateOriginY, coordinateOriginZ, coordinateNorthAngle),
                new ProjectInfo.Criteria(criteriaDesignLife, criteriaReliabilityClass, criteriaExposure, criteriaConcreteClass, criteriaCover, criteriaPhilosophy),
                new ProjectInfo.Environment(environmentTerrainDatasetId, environmentLandXmlImportId),
                lastModified);
    }
}
