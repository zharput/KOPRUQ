package com.kopruq.bridge.api;

import com.kopruq.bridge.api.LoadInputDtos.SeismicInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.SelfWeightInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TemperatureInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TrafficLm1Dto;
import com.kopruq.bridge.api.LoadInputDtos.WindInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.WindSnapshotDto;

/** The {@code loads} object of the project document: always present, each member null until written. */
public record LoadsDto(SeismicInputsDto seismic, WindInputsDto wind, TemperatureInputsDto temperature,
        SelfWeightInputsDto selfWeight, TrafficLm1Dto trafficLm1, WindSnapshotDto windSnapshot) {
}
