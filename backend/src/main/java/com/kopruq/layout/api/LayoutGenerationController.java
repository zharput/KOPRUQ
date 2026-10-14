package com.kopruq.layout.api;

import com.kopruq.layout.domain.BridgeLayoutEngine;
import com.kopruq.layout.model.NoPierZone;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * LAYOUT-P01 (docs/site-layout-platform-analysis.md sections D, G, M,
 * addendum Q): generates candidate bridge layouts for one straight
 * alignment / one bridge site / a set of no-pier zones, returned as a
 * flat table-ready list (feasible and rejected alternatives both
 * included, for traceability).
 */
@RestController
@RequestMapping("/api/layout")
public class LayoutGenerationController {

    private final BridgeLayoutEngine engine;

    public LayoutGenerationController(BridgeLayoutEngine engine) {
        this.engine = engine;
    }

    @PostMapping("/generate")
    public List<LayoutAlternativeRow> generate(@RequestBody LayoutGenerationRequest request) {
        var alignment = request.toAlignment();
        var site = request.toBridgeSite();
        var noPierZones = request.noPierZones() == null
                ? List.<com.kopruq.layout.model.NoPierZone>of()
                : request.noPierZones().stream().map(NoPierZoneRequest::toNoPierZone).toList();
        var designSpace = request.toLayoutDesignSpace();

        return engine.generate(alignment, site, noPierZones, designSpace)
                .stream()
                .map(LayoutAlternativeRow::from)
                .toList();
    }
}
