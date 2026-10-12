package com.kopruq.api.config;

import com.kopruq.analysisengine.KopruqAnalysisEngine;
import com.kopruq.api.alignment.application.ChainageSampler;
import com.kopruq.api.fastsolver.FastSolverModelBuilder;
import com.kopruq.api.landxml.application.LandXmlImportUseCase;
import com.kopruq.bridgelayout.BridgeLayoutEngine;
import com.kopruq.generative.AlternativeGenerator;
import com.kopruq.landxml.LandXmlImportRepository;
import com.kopruq.landxml.LandXmlImportService;
import com.kopruq.rules.RuleEngine;
import com.kopruq.terrain.TerrainImportService;
import com.kopruq.terrain.TerrainQueryService;
import com.kopruq.terrain.TerrainRepository;
import com.kopruq.trafficloads.Lm1DefaultsFactory;
import com.kopruq.trafficloads.SeismicSpectrumService;
import com.kopruq.trafficloads.TrafficLoadGroupCatalog;
import com.kopruq.trafficloads.TrafficLoadsService;
import com.kopruq.trafficloads.UniformTemperatureService;
import com.kopruq.trafficloads.WindLoadsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Composition root for the framework-free domain services.
 *
 * <p>The domain modules deliberately know nothing about Spring (they carry no {@code @Component}); this class is
 * the one place that turns them into beans, so controllers receive their collaborators through the constructor
 * instead of building them with {@code new}. The services are stateless (or, like
 * {@link KopruqAnalysisEngine}, thread-safe), so one shared instance each is fine. The two stateful
 * repositories live in {@link SharedRepositoriesConfig}.
 */
@Configuration(proxyBeanMethods = false)
public class CoreConfiguration {

    @Bean
    public AlternativeGenerator alternativeGenerator() {
        return new AlternativeGenerator();
    }

    @Bean
    public RuleEngine ruleEngine() {
        return new RuleEngine();
    }

    @Bean
    public BridgeLayoutEngine bridgeLayoutEngine() {
        return new BridgeLayoutEngine();
    }

    @Bean
    public FastSolverModelBuilder fastSolverModelBuilder() {
        return new FastSolverModelBuilder();
    }

    @Bean
    public KopruqAnalysisEngine kopruqAnalysisEngine() {
        return new KopruqAnalysisEngine();
    }

    @Bean
    public TerrainImportService terrainImportService() {
        return new TerrainImportService();
    }

    @Bean
    public TerrainQueryService terrainQueryService() {
        return new TerrainQueryService();
    }

    @Bean
    public LandXmlImportService landXmlImportService() {
        return new LandXmlImportService();
    }

    @Bean
    public LandXmlImportUseCase landXmlImportUseCase(LandXmlImportService importService,
            TerrainRepository terrainRepository, LandXmlImportRepository landXmlImportRepository) {
        return new LandXmlImportUseCase(importService, terrainRepository, landXmlImportRepository);
    }

    @Bean
    public ChainageSampler chainageSampler() {
        return new ChainageSampler();
    }

    @Bean
    public Lm1DefaultsFactory lm1DefaultsFactory() {
        return new Lm1DefaultsFactory();
    }

    @Bean
    public TrafficLoadGroupCatalog trafficLoadGroupCatalog() {
        return new TrafficLoadGroupCatalog();
    }

    @Bean
    public TrafficLoadsService trafficLoadsService() {
        return new TrafficLoadsService();
    }

    @Bean
    public SeismicSpectrumService seismicSpectrumService() {
        return new SeismicSpectrumService();
    }

    @Bean
    public WindLoadsService windLoadsService() {
        return new WindLoadsService();
    }

    @Bean
    public UniformTemperatureService uniformTemperatureService() {
        return new UniformTemperatureService();
    }
}
