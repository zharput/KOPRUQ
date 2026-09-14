package com.spanova.api.landxml;

import com.spanova.alignment.Alignment;
import com.spanova.alignment.ChainagePosition;
import com.spanova.landxml.LandXmlDocument;
import com.spanova.landxml.LandXmlImportRepository;
import com.spanova.landxml.LandXmlImportResult;
import com.spanova.landxml.LandXmlImportService;
import com.spanova.spatialcore.Point3D;
import com.spanova.terrain.TerrainModel;
import com.spanova.terrain.TerrainQueryService;
import com.spanova.terrain.TerrainRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

/**
 * LANDXML-P01 (docs/roadmap.md): the two-step import flow -
 * {@code /inspect} parses a LandXML file and reports what it contains
 * (no persistence, for the import-preview screen - a file can have
 * multiple surfaces/alignments, never auto-imported); {@code /import}
 * parses again and commits the engineer's selected surface/alignment.
 * See {@code com.spanova.landxml.LandXmlImportService}'s javadoc for
 * why it re-parses rather than caching across the request boundary.
 *
 * <p>Multipart from the start (not JSON with the file embedded in a
 * string field) - TERRAIN-P01's XYZ importer broke on a real ~20MB file
 * that way; LandXML files with full face lists are typically larger
 * still.
 */
@RestController
@RequestMapping("/api/landxml")
@CrossOrigin(origins = "http://localhost:5173")
public class LandXmlController {

    private final LandXmlImportService importService = new LandXmlImportService();
    private final TerrainQueryService terrainQueryService = new TerrainQueryService();
    private final TerrainRepository terrainRepository;
    private final LandXmlImportRepository landXmlImportRepository;

    public LandXmlController(TerrainRepository terrainRepository, LandXmlImportRepository landXmlImportRepository) {
        this.terrainRepository = terrainRepository;
        this.landXmlImportRepository = landXmlImportRepository;
    }

    @PostMapping(value = "/inspect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LandXmlInspectResponse inspect(@RequestParam("file") MultipartFile file) {
        LandXmlDocument document;
        try (InputStream input = openStream(file)) {
            document = importService.inspect(input);
        } catch (IOException | RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        }
        return LandXmlInspectResponse.from(document);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LandXmlImportSummaryResponse importLandXml(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") String projectId,
            @RequestParam("coordinateSystemLabel") String coordinateSystemLabel,
            @RequestParam("surfaceName") String surfaceName,
            @RequestParam("coordinateOrder") com.spanova.landxml.CoordinateOrder coordinateOrder,
            @RequestParam(value = "alignmentName", required = false) String alignmentName) {
        String sourceFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : file.getName();

        LandXmlImportResult result;
        try (InputStream input = openStream(file)) {
            result = importService.commit(
                    input, projectId, sourceFileName, coordinateSystemLabel, surfaceName, alignmentName, coordinateOrder);
        } catch (IOException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        }

        terrainRepository.save(result.terrain());
        landXmlImportRepository.save(result);
        return LandXmlImportSummaryResponse.from(result);
    }

    /**
     * Ground (terrain-queried) vs. design (imported {@code VerticalProfile})
     * elevation along the imported alignment, sampled at a chainage step -
     * the data behind the longitudinal profile chart. {@code designElevationM}
     * is null throughout if this import had no alignment/profile selected.
     */
    @GetMapping("/{id}/profile")
    public List<LongitudinalProfilePoint> profile(@PathVariable String id, @RequestParam(defaultValue = "0") double stepM) {
        LandXmlImportResult result = landXmlImportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No LandXML import with id " + id));
        Alignment alignment = result.alignment();
        if (alignment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Import " + id + " has no alignment");
        }
        TerrainModel terrain = result.terrain();
        double totalLengthM = alignment.totalLengthM();
        double effectiveStepM = stepM > 0 ? stepM : Math.max(totalLengthM / 50, 1);

        List<LongitudinalProfilePoint> points = new ArrayList<>();
        double chainageM = 0;
        while (chainageM <= totalLengthM) {
            points.add(profilePointAt(alignment, terrain, result, chainageM));
            chainageM += effectiveStepM;
        }
        if (chainageM - effectiveStepM < totalLengthM) {
            points.add(profilePointAt(alignment, terrain, result, totalLengthM));
        }
        return points;
    }

    private LongitudinalProfilePoint profilePointAt(Alignment alignment, TerrainModel terrain, LandXmlImportResult result, double chainageM) {
        Point3D horizontal = alignment.toXYZ(new ChainagePosition(chainageM, 0, 0));
        Double groundElevationM = terrainQueryService.getElevation(terrain, horizontal.x(), horizontal.y()).orElse(null);
        Double designElevationM = result.profile() != null ? result.profile().elevationAt(chainageM) : null;
        return new LongitudinalProfilePoint(chainageM, groundElevationM, designElevationM);
    }

    private static InputStream openStream(MultipartFile file) {
        try {
            return file.getInputStream();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }
}
