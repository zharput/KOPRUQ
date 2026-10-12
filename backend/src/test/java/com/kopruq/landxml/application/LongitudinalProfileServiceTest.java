package com.kopruq.landxml.application;

import com.kopruq.alignment.domain.ChainageSampler;
import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.ChainagePosition;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.landxml.enums.CoordinateOrder;
import com.kopruq.landxml.infra.InMemoryLandXmlImportRepository;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.domain.TerrainQueryService;
import com.kopruq.terrain.infra.InMemoryTerrainRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Characterization: the service reproduces the former LandXmlController profile loop, sample for sample. */
class LongitudinalProfileServiceTest {

    private final ChainageSampler sampler = new ChainageSampler();
    private final TerrainQueryService terrainQuery = new TerrainQueryService();
    private final LongitudinalProfileService service = new LongitudinalProfileService(terrainQuery, sampler);

    private static LandXmlImportResult sampleImport(String alignmentName) {
        var useCase = new LandXmlImportUseCase(new LandXmlImportService(), new InMemoryTerrainRepository(),
                new InMemoryLandXmlImportRepository());
        return useCase.importLandXml(LongitudinalProfileServiceTest.class.getResourceAsStream("/landxml/sample.landxml"),
                "p1", "sample.landxml", "Local", "Existing Ground", alignmentName, CoordinateOrder.FIRST_Y_SECOND_X);
    }

    @Test
    void matchesTheProfileSamplerChainages_theTerrainQuery_andTheProfileCoverage() {
        LandXmlImportResult result = sampleImport("Main Alignment");
        Alignment alignment = result.alignment();
        List<ProfileSample> samples = service.profile(result, 10);

        List<Double> expected = sampler.forProfile(alignment.totalLengthM(), 10);
        assertEquals(expected.size(), samples.size());
        assertTrue(samples.size() > 2);
        for (int i = 0; i < expected.size(); i++) {
            double chainageM = expected.get(i);
            ProfileSample sample = samples.get(i);
            assertEquals(chainageM, sample.chainageM(), 0.0);

            Point3D horizontal = alignment.toXYZ(new ChainagePosition(chainageM, 0, 0));
            Double ground = terrainQuery.getElevation(result.terrain(), horizontal.x(), horizontal.y()).orElse(null);
            assertEquals(ground, sample.groundElevationM());

            if (result.profile() != null && result.profile().covers(chainageM)) {
                assertEquals(result.profile().elevationAt(chainageM), sample.designElevationM(), 0.0);
            } else {
                assertNull(sample.designElevationM());
            }
        }
    }

    @Test
    void anImportWithoutAnAlignmentIsRejected() {
        LandXmlImportResult withoutAlignment = new LandXmlImportResult("i", sampleImport("Main Alignment").terrain(), null, null, List.of());
        assertThrows(IllegalArgumentException.class, () -> service.profile(withoutAlignment, 10));
    }
}
