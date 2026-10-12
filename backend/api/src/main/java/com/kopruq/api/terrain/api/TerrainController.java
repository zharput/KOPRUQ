package com.kopruq.api.terrain.api;

import com.kopruq.api.terrain.application.TerrainImportUseCase;
import com.kopruq.api.terrain.application.TerrainReadService;
import com.kopruq.terrain.TerrainImportResult;
import com.kopruq.terrain.TerrainModel;
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
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/**
 * TERRAIN-P01 (docs/roadmap.md): import a DTM point file, expose it as
 * a mesh for the 3D viewer, and answer elevation-at-(x,y) queries. See
 * {@code com.kopruq.terrain}'s package javadoc for the domain-layer
 * design; this controller is thin request/response mapping only, same
 * pattern as {@code LayoutGenerationController}.
 *
 * <p>Import is a real multipart file upload, not JSON with the file
 * text embedded in a string field (an earlier version of this endpoint
 * did that and broke on a real ~20MB DTM file - Jackson's default max
 * JSON string length is 20,000,000 characters). {@code
 * spring.servlet.multipart.max-file-size}/{@code max-request-size} are
 * raised in {@code application.properties} to 200MB accordingly.
 *
 * <p>Storage is in-memory and per-process, same as every other backend
 * service in this app today (no persistence layer exists anywhere yet).
 * All collaborators are injected; the use cases must be built over the same shared
 * repository the LandXML import writes into (see
 * {@code com.kopruq.api.config.SharedRepositoriesConfig}).
 */
@RestController
@RequestMapping("/api/terrain")
public class TerrainController {

    private final TerrainImportUseCase importUseCase;
    private final TerrainReadService readService;

    public TerrainController(TerrainImportUseCase importUseCase, TerrainReadService readService) {
        this.importUseCase = importUseCase;
        this.readService = readService;
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TerrainImportResponse importTerrain(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") String projectId,
            @RequestParam("coordinateSystemLabel") String coordinateSystemLabel) {
        String sourceFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : file.getName();
        String content;
        try {
            content = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read uploaded file " + sourceFileName, e);
        }

        TerrainImportResult result = importUseCase.importXyz(projectId, sourceFileName, coordinateSystemLabel, content);
        return TerrainImportResponse.from(result);
    }

    @GetMapping("/{id}/mesh")
    public TerrainMeshResponse mesh(@PathVariable String id) {
        return TerrainMeshResponse.from(findOrThrow(id));
    }

    @GetMapping(value="/{id}/mesh.bin", produces=MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody binaryMesh(@PathVariable String id) {
        TerrainModel terrain = findOrThrow(id);
        return output -> TerrainBinaryWriter.write(terrain, output);
    }

    public record DiagnosticLine(String name, String type, boolean edgeTrim, double[] positions) { }

    @GetMapping("/{id}/diagnostics")
    public java.util.List<DiagnosticLine> diagnostics(@PathVariable String id,
            @RequestParam(defaultValue="false") boolean breaklines) {
        TerrainModel terrain = findOrThrow(id);
        if (breaklines) return terrain.breaklines().stream()
                .map(b -> new DiagnosticLine(b.name(), "BREAKLINE", false, localPositions(b.points(),terrain))).toList();
        return terrain.boundaries().stream()
                .map(b -> new DiagnosticLine(b.name(),b.type(),b.edgeTrim(),localPositions(b.points(),terrain))).toList();
    }

    private static double[] localPositions(java.util.List<com.kopruq.spatialcore.Point3D> points, TerrainModel terrain) {
        return com.kopruq.terrain.LocalCoordinates.relativePositions(points, terrain.localOrigin());
    }

    @GetMapping("/{id}/elevation")
    public TerrainElevationResponse elevation(@PathVariable String id, @RequestParam double x, @RequestParam double y) {
        TerrainModel terrain = findOrThrow(id);
        return new TerrainElevationResponse(readService.elevationAt(terrain, x, y).orElse(null));
    }

    private TerrainModel findOrThrow(String id) {
        return readService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No terrain with id " + id));
    }
}
