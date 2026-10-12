package com.kopruq.loads.application;

import com.kopruq.loads.model.Lm1Parameters;
import com.kopruq.loads.model.NotionalLaneResult;
import com.kopruq.loads.model.TrafficValidationResult;

/** The outcome of resolving a carriageway: the notional lanes, the LM1 parameters used and their validation. */
public record TrafficResolution(NotionalLaneResult lanes, Lm1Parameters lm1, TrafficValidationResult validation) {
}
