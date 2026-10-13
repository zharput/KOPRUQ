package com.kopruq.bridge.api;

import com.kopruq.bridge.api.DesignSystemPutRequests.SectionPut;
import com.kopruq.bridge.api.LoadInputDtos.SeismicInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.SelfWeightInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TemperatureInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TrafficLm1Dto;
import com.kopruq.bridge.api.LoadInputDtos.WindInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.WindSnapshotDto;

/** Bodies of the load-input {@code PUT} endpoints: the revision the client last saw, and the new value (null clears). */
public final class LoadInputPutRequests {

    private LoadInputPutRequests() {
    }

    public record SeismicPut(Long expectedRevision, SeismicInputsDto value) implements SectionPut<SeismicInputsDto> {
    }

    public record WindPut(Long expectedRevision, WindInputsDto value) implements SectionPut<WindInputsDto> {
    }

    public record TemperaturePut(Long expectedRevision, TemperatureInputsDto value)
            implements SectionPut<TemperatureInputsDto> {
    }

    public record SelfWeightPut(Long expectedRevision, SelfWeightInputsDto value)
            implements SectionPut<SelfWeightInputsDto> {
    }

    public record TrafficLm1Put(Long expectedRevision, TrafficLm1Dto value) implements SectionPut<TrafficLm1Dto> {
    }

    public record WindSnapshotPut(Long expectedRevision, WindSnapshotDto value)
            implements SectionPut<WindSnapshotDto> {
    }
}
