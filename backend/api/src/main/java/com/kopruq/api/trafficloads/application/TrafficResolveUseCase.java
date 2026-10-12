package com.kopruq.api.trafficloads.application;

import com.kopruq.trafficloads.CarriagewayInput;
import com.kopruq.trafficloads.Lm1Parameters;
import com.kopruq.trafficloads.NotionalLaneResult;
import com.kopruq.trafficloads.TrafficLoadsService;
import com.kopruq.trafficloads.TrafficValidationResult;

/** Generates the notional lanes of a carriageway and validates them against the LM1 parameters. */
public class TrafficResolveUseCase {

    private final TrafficLoadsService service;

    public TrafficResolveUseCase(TrafficLoadsService service) {
        this.service = service;
    }

    /** @throws IllegalArgumentException if {@code carriageway} is null */
    public TrafficResolution resolve(CarriagewayInput carriageway, Lm1Parameters lm1) {
        if (carriageway == null) {
            throw new IllegalArgumentException("carriageway is required");
        }
        NotionalLaneResult lanes = service.generateLanes(carriageway);
        TrafficValidationResult validation = service.validate(lanes, lm1);
        return new TrafficResolution(lanes, lm1, validation);
    }
}
