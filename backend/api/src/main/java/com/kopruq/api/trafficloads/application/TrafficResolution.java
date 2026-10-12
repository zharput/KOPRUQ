package com.kopruq.api.trafficloads.application;

import com.kopruq.trafficloads.Lm1Parameters;
import com.kopruq.trafficloads.NotionalLaneResult;
import com.kopruq.trafficloads.TrafficValidationResult;

/** The outcome of resolving a carriageway: the notional lanes, the LM1 parameters used and their validation. */
public record TrafficResolution(NotionalLaneResult lanes, Lm1Parameters lm1, TrafficValidationResult validation) {
}
