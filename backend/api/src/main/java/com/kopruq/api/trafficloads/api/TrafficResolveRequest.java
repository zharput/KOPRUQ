package com.kopruq.api.trafficloads.api;

import com.kopruq.trafficloads.CarriagewayInput;
import com.kopruq.trafficloads.Lm1Parameters;

public record TrafficResolveRequest(CarriagewayInput carriageway, Lm1Parameters lm1) {
}
