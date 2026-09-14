package com.spanova.api.config;

import com.spanova.landxml.InMemoryLandXmlImportRepository;
import com.spanova.landxml.LandXmlImportRepository;
import com.spanova.terrain.InMemoryTerrainRepository;
import com.spanova.terrain.TerrainRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * {@code TerrainRepository} must be a single shared instance across
 * {@code TerrainController} AND {@code LandXmlController} - both write
 * terrain models that the OTHER's {@code /api/terrain/{id}/mesh|
 * elevation} endpoints must be able to find (LANDXML-P01,
 * docs/roadmap.md). Same reasoning for {@code LandXmlImportRepository}
 * - written by {@code LandXmlController}, read by {@code
 * AlignmentController}'s {@code /api/alignment/{id}/sample}.
 *
 * <p>Every other service in this app stays a plain per-controller field
 * (`private final X service = new X();`, e.g. {@code
 * LayoutGenerationController}/{@code TerrainController}'s own
 * import/query services) - those are stateless, so sharing an instance
 * doesn't matter. These two repositories are the only case where two
 * different controllers must see the same mutable state, which is what
 * actually requires Spring-managed singleton beans here.
 */
@Configuration
public class SharedRepositoriesConfig {

    @Bean
    public TerrainRepository terrainRepository() {
        return new InMemoryTerrainRepository();
    }

    @Bean
    public LandXmlImportRepository landXmlImportRepository() {
        return new InMemoryLandXmlImportRepository();
    }
}
