package com.spanova.api.trafficloads;

import com.spanova.trafficloads.CarriagewayInput;
import com.spanova.trafficloads.Lm1Parameters;

public record TrafficResolveRequest(CarriagewayInput carriageway, Lm1Parameters lm1) {
}
