package com.kopruq.api.trafficloads;

import com.kopruq.trafficloads.UniformTemperatureRequest;
import com.kopruq.trafficloads.UniformTemperatureResult;
import com.kopruq.trafficloads.UniformTemperatureService;
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
