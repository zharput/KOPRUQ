package com.kopruq.loads.api;

import com.kopruq.loads.domain.SeismicSpectrumService;
import com.kopruq.loads.model.SeismicSpectrumRequest;
import com.kopruq.loads.model.SeismicSpectrumResult;
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
