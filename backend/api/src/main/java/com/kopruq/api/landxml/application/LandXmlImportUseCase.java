package com.kopruq.api.landxml.application;

import com.kopruq.landxml.CoordinateOrder;
import com.kopruq.landxml.LandXmlImportRepository;
import com.kopruq.landxml.LandXmlImportResult;
import com.kopruq.landxml.LandXmlImportService;
import com.kopruq.terrain.TerrainRepository;

import java.io.InputStream;

/**
 * The "commit a LandXML import" use case: run the import and store its two outputs - the terrain (in the
 * {@link TerrainRepository}, where the {@code /api/terrain/{id}/...} endpoints read it) and the import itself
 * (alignment + profile, in the {@link LandXmlImportRepository}).
 *
 * <p>The two stores are separate and there is no transaction manager, so a failure of the second write would
 * leave an orphan terrain that no import record points to. This use case compensates: if storing the import
 * fails, the terrain it just stored is deleted again and the original failure is rethrown. (The in-memory
 * stores are lost on restart anyway, so this only covers in-process failures.)
 */
public class LandXmlImportUseCase {

    private final LandXmlImportService importService;
    private final TerrainRepository terrainRepository;
    private final LandXmlImportRepository landXmlImportRepository;

    public LandXmlImportUseCase(LandXmlImportService importService, TerrainRepository terrainRepository,
            LandXmlImportRepository landXmlImportRepository) {
        this.importService = importService;
        this.terrainRepository = terrainRepository;
        this.landXmlImportRepository = landXmlImportRepository;
    }

    public LandXmlImportResult importLandXml(InputStream input, String projectId, String sourceFileName,
            String coordinateSystemLabel, String surfaceName, String alignmentName, CoordinateOrder coordinateOrder) {
        LandXmlImportResult result = importService.commit(
                input, projectId, sourceFileName, coordinateSystemLabel, surfaceName, alignmentName, coordinateOrder);

        terrainRepository.save(result.terrain());
        try {
            landXmlImportRepository.save(result);
        } catch (RuntimeException | Error failure) {
            terrainRepository.deleteById(result.terrain().id());
            throw failure;
        }
        return result;
    }
}
