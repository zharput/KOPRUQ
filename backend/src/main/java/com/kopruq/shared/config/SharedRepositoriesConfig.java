package com.kopruq.shared.config;

import com.kopruq.landxml.application.LandXmlImportRepository;
import com.kopruq.landxml.infra.InMemoryLandXmlImportRepository;
import com.kopruq.terrain.application.TerrainRepository;
import com.kopruq.terrain.infra.InMemoryTerrainRepository;
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
 * <p>Every other service is a stateless bean built in {@link CoreConfiguration}
 * and injected through constructors (controllers never build collaborators
 * with {@code new}), so sharing an instance does not matter for them. These
 * two repositories are the only case where two different controllers must
 * see the same mutable state, which is why they are single shared beans.
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
