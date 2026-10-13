package com.kopruq.bridge.api;

import java.util.List;

/**
 * JSON shapes of the six load-input sections. Numbers are boxed so a missing one can be told from zero; provenance
 * is the constant name (a string here, checked by the mapper). String inputs are the user-typed texts, unchanged.
 */
public final class LoadInputDtos {

    private LoadInputDtos() {
    }

    public record SeismicInputsDto(String a, String g, String t, String i) {
    }

    public record WindInputsDto(String vb, String terrain, String ze) {
    }

    public record TemperatureInputsDto(String min, String max, String t0) {
    }

    /** Thicknesses and widths in metres, unit weights in kN/m3, unit loads in kN/m (as the names state); counts unitless. */
    public record SelfWeightInputsDto(Double asphaltThicknessM, Double asphaltUnitWeightKNm3,
            Double sidewalkThicknessM, Double sidewalkUnitWeightKNm3, Double faciaCount, Double faciaWidthM,
            Double faciaThicknessM, Double faciaUnitWeightKNm3, Double guardrailCount, Double guardrailUnitLoadKNm,
            Double pedestrianRailingCount, Double pedestrianRailingUnitLoadKNm, Double protectiveFenceCount,
            Double protectiveFenceUnitLoadKNm, Double soundPanelCount, Double soundPanelUnitLoadKNm) {
    }

    public record Lm1ParameterValueDto(Double value, String provenance, Double codeDefaultValue) {
    }

    public record Lm1LaneFactorDto(String label, Lm1ParameterValueDto characteristicValue,
            Lm1ParameterValueDto adjustmentFactor) {
    }

    public record TrafficLm1Dto(List<Lm1LaneFactorDto> tandemSystem, List<Lm1LaneFactorDto> udl,
            Lm1LaneFactorDto remainingAreaUdl) {
    }

    public record WindSnapshotInputsDto(String vb, String terrain, String ze, Double deckWidthM, Double drefM) {
    }

    /** The wind snapshot: inputs only; a {@code result} is not a known field. */
    public record WindSnapshotDto(Integer schemaVersion, String status, WindSnapshotInputsDto inputs) {
    }
}
