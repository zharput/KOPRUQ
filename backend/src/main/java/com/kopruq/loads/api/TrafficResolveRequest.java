package com.kopruq.loads.api;

import com.kopruq.loads.model.CarriagewayInput;
import com.kopruq.loads.model.Lm1Parameters;

public record TrafficResolveRequest(CarriagewayInput carriageway, Lm1Parameters lm1) {
}
