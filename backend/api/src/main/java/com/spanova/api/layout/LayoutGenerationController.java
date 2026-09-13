package com.spanova.api.layout;

import com.spanova.bridgelayout.BridgeLayoutEngine;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * LAYOUT-P01 (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md sections D, G, M,
 * addendum Q): generates candidate bridge layouts for one straight
 * alignment / one bridge site / a set of no-pier zones, returned as a
 * flat table-ready list (feasible and rejected alternatives both
 * included, for traceability).
 */
@RestController
@RequestMapping("/api/layout")
@CrossOrigin(origins = "http://localhost:5173")
public class LayoutGenerationController {

    private final BridgeLayoutEngine engine = new BridgeLayoutEngine();

    @PostMapping("/generate")
    public List<LayoutAlternativeRow> generate(@RequestBody LayoutGenerationRequest request) {
        var alignment = request.toAlignment();
        var site = request.toBridgeSite();
        var noPierZones = request.noPierZones() == null
                ? List.<com.spanova.constraints.NoPierZone>of()
                : request.noPierZones().stream().map(NoPierZoneRequest::toNoPierZone).toList();
        var designSpace = request.toLayoutDesignSpace();

        return engine.generate(alignment, site, noPierZones, designSpace)
                .stream()
                .map(LayoutAlternativeRow::from)
                .toList();
    }
}
