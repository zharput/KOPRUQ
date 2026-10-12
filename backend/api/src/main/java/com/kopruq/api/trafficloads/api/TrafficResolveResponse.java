package com.kopruq.api.trafficloads;

import com.kopruq.trafficloads.Lm1Parameters;
import com.kopruq.trafficloads.NotionalLaneResult;
import com.kopruq.trafficloads.TrafficValidationResult;

public record TrafficResolveResponse(NotionalLaneResult notionalLanes, Lm1Parameters lm1, TrafficValidationResult validation) {
}
