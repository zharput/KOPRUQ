package com.kopruq.api.trafficloads.api;

import com.kopruq.api.trafficloads.application.TrafficResolution;
import com.kopruq.api.trafficloads.application.TrafficResolveUseCase;
import com.kopruq.trafficloads.Lm1DefaultsFactory;
import com.kopruq.trafficloads.Lm1Parameters;
import com.kopruq.trafficloads.TrafficLoadGroup;
import com.kopruq.trafficloads.TrafficLoadGroupCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * TRAFFIC-P01 (docs/roadmap.md): road-bridge traffic loads, EN 1991-2.
 * Thin request/response mapping only, same pattern as every other
 * controller in this app - the real logic lives in {@code
 * com.kopruq.trafficloads}. No persistence yet (matches every other
 * Loads screen in this app today - not wired into backend
 * computation/persistence beyond a single request/response round trip).
 *
 * <p>EN 1990 load combinations are explicitly NOT here - a separate,
 * future module.
 */
@RestController
@RequestMapping("/api/traffic-loads")
public class TrafficLoadsController {

    private final Lm1DefaultsFactory lm1DefaultsFactory;
    private final TrafficLoadGroupCatalog loadGroupCatalog;
    private final TrafficResolveUseCase resolveUseCase;

    public TrafficLoadsController(Lm1DefaultsFactory lm1DefaultsFactory, TrafficLoadGroupCatalog loadGroupCatalog,
            TrafficResolveUseCase resolveUseCase) {
        this.lm1DefaultsFactory = lm1DefaultsFactory;
        this.loadGroupCatalog = loadGroupCatalog;
        this.resolveUseCase = resolveUseCase;
    }

    @GetMapping("/lm1-defaults")
    public Lm1Parameters lm1Defaults(@RequestParam(defaultValue = "3") int laneCount) {
        return lm1DefaultsFactory.codeDefaults(laneCount);
    }

    @GetMapping("/load-groups")
    public List<TrafficLoadGroup> loadGroups() {
        return loadGroupCatalog.placeholderGroups();
    }

    @PostMapping("/resolve")
    public TrafficResolveResponse resolve(@RequestBody TrafficResolveRequest request) {
        TrafficResolution resolution = resolveUseCase.resolve(request.carriageway(), request.lm1());
        return new TrafficResolveResponse(resolution.lanes(), resolution.lm1(), resolution.validation());
    }
}
