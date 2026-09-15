package com.spanova.api.trafficloads;

import com.spanova.trafficloads.UniformTemperatureRequest;
import com.spanova.trafficloads.UniformTemperatureResult;
import com.spanova.trafficloads.UniformTemperatureService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/temperature")
@CrossOrigin(origins = "http://localhost:5173")
public class UniformTemperatureController {
    private final UniformTemperatureService service = new UniformTemperatureService();

    @PostMapping("/uniform/resolve")
    public UniformTemperatureResult resolve(@RequestBody UniformTemperatureRequest request) {
        return service.resolve(request);
    }
}
