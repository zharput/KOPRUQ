package com.kopruq.landxml.api;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.landxml.application.LandXmlImportQueries;
import com.kopruq.landxml.application.LandXmlImportUseCase;
import com.kopruq.landxml.application.LongitudinalProfileService;
import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.model.LandXmlDocument;
import com.kopruq.landxml.model.LandXmlImportResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import java.util.List;

/**
 * LANDXML-P01 (docs/roadmap.md): the two-step import flow -
 * {@code /inspect} parses a LandXML file and reports what it contains
 * (no persistence, for the import-preview screen - a file can have
 * multiple surfaces/alignments, never auto-imported); {@code /import}
 * parses again and commits the engineer's selected surface/alignment.
 * See {@code com.kopruq.landxml.domain.LandXmlImportService}'s javadoc for
 * why it re-parses rather than caching across the request boundary.
 *
 * <p>Multipart from the start (not JSON with the file embedded in a
 * string field) - TERRAIN-P01's XYZ importer broke on a real ~20MB file
 * that way; LandXML files with full face lists are typically larger
 * still.
 */
@RestController
@RequestMapping("/api/landxml")
public class LandXmlController {

    private final LandXmlImportService importService;
    private final LandXmlImportQueries importQueries;
    private final LandXmlImportUseCase importUseCase;
    private final LongitudinalProfileService profileService;

    public LandXmlController(LandXmlImportService importService, LandXmlImportQueries importQueries,
            LandXmlImportUseCase importUseCase, LongitudinalProfileService profileService) {
        this.importService = importService;
        this.importQueries = importQueries;
        this.importUseCase = importUseCase;
        this.profileService = profileService;
    }

    @PostMapping(value = "/inspect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LandXmlInspectResponse inspect(@RequestParam("file") MultipartFile file) {
        LandXmlDocument document;
        try (InputStream input = openStream(file)) {
            document = importService.inspect(input);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
        return LandXmlInspectResponse.from(document);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LandXmlImportSummaryResponse importLandXml(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") String projectId,
            @RequestParam("coordinateSystemLabel") String coordinateSystemLabel,
            @RequestParam("surfaceName") String surfaceName,
            @RequestParam("coordinateOrder") com.kopruq.landxml.enums.CoordinateOrder coordinateOrder,
            @RequestParam(value = "alignmentName", required = false) String alignmentName) {
        String sourceFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : file.getName();

        LandXmlImportResult result;
        try (InputStream input = openStream(file)) {
            result = importUseCase.importLandXml(
                    input, projectId, sourceFileName, coordinateSystemLabel, surfaceName, alignmentName, coordinateOrder);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }

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
        LandXmlImportResult result = importQueries.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No LandXML import with id " + id));
        Alignment alignment = result.alignment();
        if (alignment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Import " + id + " has no alignment");
        }
        return profileService.profile(result, stepM).stream()
                .map(p -> new LongitudinalProfilePoint(p.chainageM(), p.groundElevationM(), p.designElevationM()))
                .toList();
    }

    private static InputStream openStream(MultipartFile file) {
        try {
            return file.getInputStream();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }
}
