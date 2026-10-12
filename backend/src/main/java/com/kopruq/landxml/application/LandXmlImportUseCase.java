package com.kopruq.landxml.application;

import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.application.TerrainRepository;

import org.springframework.transaction.support.TransactionOperations;

import java.io.InputStream;

/**
 * The "commit a LandXML import" use case: run the import and store its two outputs - the terrain (in the
 * {@link TerrainRepository}, where the {@code /api/terrain/{id}/...} endpoints read it) and the import itself
 * (alignment + profile, in the {@link LandXmlImportRepository}).
 *
 * <p>Parsing runs outside any transaction (it can be slow and touches no database); the two writes run together in
 * one transaction ({@link TransactionOperations}), so a failure of the second rolls back the first and no orphan
 * terrain remains. The compensating {@code deleteById} is kept as well: with
 * {@link TransactionOperations#withoutTransaction()} (the 3-argument constructor, used by in-memory stores that have
 * no transaction support) it is the only protection, and it is harmless after a rollback.
 */
public class LandXmlImportUseCase {

    private final LandXmlImportService importService;
    private final TerrainRepository terrainRepository;
    private final LandXmlImportRepository landXmlImportRepository;
    private final TransactionOperations transactions;

    public LandXmlImportUseCase(LandXmlImportService importService, TerrainRepository terrainRepository,
            LandXmlImportRepository landXmlImportRepository) {
        this(importService, terrainRepository, landXmlImportRepository, TransactionOperations.withoutTransaction());
    }

    public LandXmlImportUseCase(LandXmlImportService importService, TerrainRepository terrainRepository,
            LandXmlImportRepository landXmlImportRepository, TransactionOperations transactions) {
        this.importService = importService;
        this.terrainRepository = terrainRepository;
        this.landXmlImportRepository = landXmlImportRepository;
        this.transactions = transactions;
    }

    public LandXmlImportResult importLandXml(InputStream input, String projectId, String sourceFileName,
            String coordinateSystemLabel, String surfaceName, String alignmentName, CoordinateOrder coordinateOrder) {
        LandXmlImportResult result = importService.commit(
                input, projectId, sourceFileName, coordinateSystemLabel, surfaceName, alignmentName, coordinateOrder);

        transactions.executeWithoutResult(status -> {
            terrainRepository.save(result.terrain());
            try {
                landXmlImportRepository.save(result);
            } catch (RuntimeException | Error failure) {
                try {
                    terrainRepository.deleteById(result.terrain().id());
                } catch (RuntimeException | Error compensationFailure) {
                    // inside a failed transaction the compensation may not be possible; the rollback covers it
                    failure.addSuppressed(compensationFailure);
                }
                throw failure;
            }
        });
        return result;
    }
}
