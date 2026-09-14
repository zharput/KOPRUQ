package com.spanova.api.trafficloads;

import com.spanova.trafficloads.Lm1Parameters;
import com.spanova.trafficloads.NotionalLaneResult;
import com.spanova.trafficloads.TrafficValidationResult;

public record TrafficResolveResponse(NotionalLaneResult notionalLanes, Lm1Parameters lm1, TrafficValidationResult validation) {
}
