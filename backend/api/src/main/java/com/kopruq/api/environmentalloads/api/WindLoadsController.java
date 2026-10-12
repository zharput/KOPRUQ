package com.kopruq.api.environmentalloads.api;

import com.kopruq.environmentalloads.WindLoadsService;
import com.kopruq.environmentalloads.WindRequest;
import com.kopruq.environmentalloads.WindResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** EN 1991-1-4 wind action - thin request/response mapping only; the logic is in {@link WindLoadsService}. */
@RestController
@RequestMapping("/api/wind-loads")
public class WindLoadsController {

    private final WindLoadsService service;

    public WindLoadsController(WindLoadsService service) {
        this.service = service;
    }

    @PostMapping("/resolve")
    public WindResult resolve(@RequestBody WindRequest request) {
        return service.resolve(request);
    }
}
