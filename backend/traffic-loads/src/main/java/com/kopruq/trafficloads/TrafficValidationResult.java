package com.kopruq.trafficloads;

import java.util.List;

public record TrafficValidationResult(boolean carriagewayDefined, boolean notionalLanesGenerated, boolean lm1Resolved, List<String> warnings) {
}
