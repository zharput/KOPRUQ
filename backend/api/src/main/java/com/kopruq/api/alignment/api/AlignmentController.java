package com.kopruq.api.alignment.api;

import com.kopruq.alignment.Alignment;
import com.kopruq.api.alignment.application.AlignmentSample;
import com.kopruq.api.alignment.application.AlignmentSamplingService;
import com.kopruq.api.landxml.application.LandXmlImportQueries;
import com.kopruq.landxml.LandXmlImportResult;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * TERRAIN-P01's alignment overlay (docs/roadmap.md): samples XYZ points
 * along a straight alignment at a fixed chainage step, reusing {@link
 * Alignment#toXYZ} exactly as it already exists - no new alignment
 * engineering logic, just a thin REST wrapper so the 3D viewer can draw
 * the alignment.
 *
 * <p>LANDXML-P01 adds {@link #sampleImported} - the same sampling, but
 * against a *real*, committed LandXML alignment (which may include
 * circular arcs) instead of a straight line typed into the viewer.
 * Neither endpoint returns z - no vertical alignment model existed when
 * {@code /sample} was built, and even now that {@code VerticalProfile}
 * exists, the 3D viewer deliberately drapes the overlay onto live
 * terrain elevation (ground), not the design profile - see
 * {@code AlignmentOverlay.tsx} and the longitudinal profile chart,
 * which is where the design profile is actually shown.
 */
@RestController
@RequestMapping("/api/alignment")
public class AlignmentController {

    private final LandXmlImportQueries importQueries;
    private final AlignmentSamplingService samplingService;

    public AlignmentController(LandXmlImportQueries importQueries, AlignmentSamplingService samplingService) {
        this.importQueries = importQueries;
        this.samplingService = samplingService;
    }

    @PostMapping("/sample")
    public List<AlignmentSamplePoint> sample(@RequestBody AlignmentSampleRequest request) {
        request.validate();
        return toPoints(samplingService.sample(request.toAlignment(), request.stepM()));
    }

    @GetMapping("/{id}/sample")
    public List<AlignmentSamplePoint> sampleImported(@PathVariable String id, @RequestParam(defaultValue = "0") double stepM) {
        LandXmlImportResult result = importQueries.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No LandXML import with id " + id));
        Alignment alignment = result.alignment();
        if (alignment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Import " + id + " has no alignment");
        }
        return toPoints(samplingService.sample(alignment, stepM));
    }

    private static List<AlignmentSamplePoint> toPoints(List<AlignmentSample> samples) {
        return samples.stream().map(s -> new AlignmentSamplePoint(s.xM(), s.yM(), s.chainageM())).toList();
    }
}
