package com.spanova.api.alignment;

import com.spanova.alignment.Alignment;
import com.spanova.alignment.ChainagePosition;
import com.spanova.alignment.StraightElement;
import com.spanova.landxml.LandXmlImportRepository;
import com.spanova.landxml.LandXmlImportResult;
import com.spanova.spatialcore.Point3D;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
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
@CrossOrigin(origins = "http://localhost:5173")
public class AlignmentController {

    private final LandXmlImportRepository landXmlImportRepository;

    public AlignmentController(LandXmlImportRepository landXmlImportRepository) {
        this.landXmlImportRepository = landXmlImportRepository;
    }

    @PostMapping("/sample")
    public List<AlignmentSamplePoint> sample(@RequestBody AlignmentSampleRequest request) {
        var start = new Point3D(request.startXM(), request.startYM(), 0);
        var end = new Point3D(request.endXM(), request.endYM(), 0);
        var alignment = new Alignment(List.of(new StraightElement(start, end)));
        return sampleAt(alignment, request.stepM());
    }

    @GetMapping("/{id}/sample")
    public List<AlignmentSamplePoint> sampleImported(@PathVariable String id, @RequestParam(defaultValue = "0") double stepM) {
        LandXmlImportResult result = landXmlImportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No LandXML import with id " + id));
        Alignment alignment = result.alignment();
        if (alignment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Import " + id + " has no alignment");
        }
        return sampleAt(alignment, stepM);
    }

    private static List<AlignmentSamplePoint> sampleAt(Alignment alignment, double requestedStepM) {
        double totalLengthM = alignment.totalLengthM();
        double stepM = requestedStepM > 0 ? requestedStepM : Math.max(totalLengthM / 20, 1);

        List<AlignmentSamplePoint> samples = new ArrayList<>();
        double chainageM = 0;
        while (chainageM < totalLengthM) {
            Point3D p = alignment.toXYZ(new ChainagePosition(chainageM, 0, 0));
            samples.add(new AlignmentSamplePoint(p.x(), p.y(), chainageM));
            chainageM += stepM;
        }
        Point3D lastPoint = alignment.toXYZ(new ChainagePosition(totalLengthM, 0, 0));
        samples.add(new AlignmentSamplePoint(lastPoint.x(), lastPoint.y(), totalLengthM));
        return samples;
    }
}
