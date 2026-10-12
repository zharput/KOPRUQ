package com.kopruq.api.environmentalloads.api;

import com.kopruq.environmentalloads.SeismicSpectrumRequest;
import com.kopruq.environmentalloads.SeismicSpectrumResult;
import com.kopruq.environmentalloads.SeismicSpectrumService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Elastic response spectrum - thin request/response mapping only; the logic is in {@link SeismicSpectrumService}. */
@RestController
@RequestMapping("/api/seismic")
public class SeismicSpectrumController {

    private final SeismicSpectrumService service;

    public SeismicSpectrumController(SeismicSpectrumService service) {
        this.service = service;
    }

    @PostMapping("/spectrum")
    public SeismicSpectrumResult spectrum(@RequestBody SeismicSpectrumRequest request) {
        return service.resolve(request);
    }
}
