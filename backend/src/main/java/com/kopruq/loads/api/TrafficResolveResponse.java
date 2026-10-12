package com.kopruq.loads.api;

import com.kopruq.loads.model.Lm1Parameters;
import com.kopruq.loads.model.NotionalLaneResult;
import com.kopruq.loads.model.TrafficValidationResult;

public record TrafficResolveResponse(NotionalLaneResult notionalLanes, Lm1Parameters lm1, TrafficValidationResult validation) {
}
