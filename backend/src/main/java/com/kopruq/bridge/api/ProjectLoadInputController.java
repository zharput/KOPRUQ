package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.kopruq.bridge.api.LoadInputDtos.SeismicInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.SelfWeightInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TemperatureInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TrafficLm1Dto;
import com.kopruq.bridge.api.LoadInputDtos.WindInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.WindSnapshotDto;
import com.kopruq.bridge.application.ProjectService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * The load-input sections of a stored project: seismic, wind, temperature, self-weight, traffic LM1 and the wind
 * calculation snapshot (inputs only). Each {@code PUT} replaces its whole section if {@code expectedRevision} is
 * current (else 409); {@code "value": null} clears the section. Bodies are read strictly and validated structurally
 * only. CORS comes from the central policy.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/loads")
public class ProjectLoadInputController {

    private static final String VALUE = SectionPutFlow.VALUE;

    private final ProjectService projects;
    private final ProjectRequestReader reader;

    public ProjectLoadInputController(ProjectService projects, ProjectRequestReader reader) {
        this.projects = projects;
        this.reader = reader;
    }

    @PutMapping("/seismic")
    public SectionWriteResponse<SeismicInputsDto> putSeismic(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, LoadInputPutRequests.SeismicPut.class,
                v -> LoadInputMapper.toSeismic(v, VALUE), s -> LoadInputMapper.seismicDto(s.inputs()));
    }

    @PutMapping("/wind")
    public SectionWriteResponse<WindInputsDto> putWind(@PathVariable UUID projectId, @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, LoadInputPutRequests.WindPut.class,
                v -> LoadInputMapper.toWind(v, VALUE), s -> LoadInputMapper.windDto(s.inputs()));
    }

    @PutMapping("/temperature")
    public SectionWriteResponse<TemperatureInputsDto> putTemperature(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, LoadInputPutRequests.TemperaturePut.class,
                v -> LoadInputMapper.toTemperature(v, VALUE), s -> LoadInputMapper.temperatureDto(s.inputs()));
    }

    @PutMapping("/self-weight")
    public SectionWriteResponse<SelfWeightInputsDto> putSelfWeight(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, LoadInputPutRequests.SelfWeightPut.class,
                v -> LoadInputMapper.toSelfWeight(v, VALUE), s -> LoadInputMapper.selfWeightDto(s.inputs()));
    }

    @PutMapping("/traffic-lm1")
    public SectionWriteResponse<TrafficLm1Dto> putTrafficLm1(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, LoadInputPutRequests.TrafficLm1Put.class,
                v -> LoadInputMapper.toTrafficLm1(v, VALUE), s -> LoadInputMapper.trafficLm1Dto(s.inputs()));
    }

    @PutMapping("/wind-snapshot")
    public SectionWriteResponse<WindSnapshotDto> putWindSnapshot(@PathVariable UUID projectId,
            @RequestBody JsonNode body) {
        return SectionPutFlow.write(projects, reader, projectId, body, LoadInputPutRequests.WindSnapshotPut.class,
                v -> LoadInputMapper.toWindSnapshot(v, VALUE), s -> LoadInputMapper.windSnapshotDto(s.snapshot()));
    }
}
