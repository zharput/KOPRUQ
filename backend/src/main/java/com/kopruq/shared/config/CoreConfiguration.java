package com.kopruq.shared.config;

import com.kopruq.alignment.application.AlignmentSamplingService;
import com.kopruq.alignment.domain.ChainageSampler;
import com.kopruq.analysis.api.FastSolverModelBuilder;
import com.kopruq.analysis.application.FastSolverService;
import com.kopruq.analysis.infra.nativeengine.KopruqAnalysisEngine;
import com.kopruq.generative.domain.AlternativeGenerator;
import com.kopruq.generative.domain.EvaluatedAlternativeGenerator;
import com.kopruq.landxml.application.LandXmlImportQueries;
import com.kopruq.landxml.application.LandXmlImportRepository;
import com.kopruq.landxml.application.LandXmlImportUseCase;
import com.kopruq.landxml.application.LongitudinalProfileService;
import com.kopruq.landxml.domain.LandXmlImportService;
import com.kopruq.layout.domain.BridgeLayoutEngine;
import com.kopruq.loads.application.TrafficResolveUseCase;
import com.kopruq.loads.domain.Lm1DefaultsFactory;
import com.kopruq.loads.domain.SeismicSpectrumService;
import com.kopruq.loads.domain.TrafficLoadGroupCatalog;
import com.kopruq.loads.domain.TrafficLoadsService;
import com.kopruq.loads.domain.UniformTemperatureService;
import com.kopruq.loads.domain.WindLoadsService;
import com.kopruq.rules.domain.RuleEngine;
import com.kopruq.terrain.application.TerrainImportUseCase;
import com.kopruq.terrain.application.TerrainReadService;
import com.kopruq.terrain.application.TerrainRepository;
import com.kopruq.terrain.domain.TerrainImportService;
import com.kopruq.terrain.domain.TerrainQueryService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Composition root for the framework-free domain services.
 *
 * <p>The domain modules deliberately know nothing about Spring (they carry no {@code @Component}); this class is
 * the one place that turns them into beans, so controllers receive their collaborators through the constructor
 * instead of building them with {@code new}. The services are stateless (or, like
 * {@link KopruqAnalysisEngine}, thread-safe), so one shared instance each is fine. The repositories are
 * JPA adapters found by component scan ({@code <domain>.infra.persistence}).
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
    public EvaluatedAlternativeGenerator evaluatedAlternativeGenerator(AlternativeGenerator alternativeGenerator,
            RuleEngine ruleEngine) {
        return new EvaluatedAlternativeGenerator(alternativeGenerator, ruleEngine);
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

    /** The native engine is named explicitly, so a second AnalysisEngine bean (MIDAS, P07) cannot make this ambiguous. */
    @Bean
    public FastSolverService fastSolverService(KopruqAnalysisEngine kopruqAnalysisEngine) {
        return new FastSolverService(kopruqAnalysisEngine);
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

    /** Programmatic transaction boundary for use cases that must write several repositories atomically. */
    @Bean
    public TransactionOperations transactionOperations(PlatformTransactionManager transactionManager) {
        return new TransactionTemplate(transactionManager);
    }

    @Bean
    public LandXmlImportUseCase landXmlImportUseCase(LandXmlImportService importService,
            TerrainRepository terrainRepository, LandXmlImportRepository landXmlImportRepository,
            TransactionOperations transactionOperations) {
        return new LandXmlImportUseCase(importService, terrainRepository, landXmlImportRepository,
                transactionOperations);
    }

    @Bean
    public ChainageSampler chainageSampler() {
        return new ChainageSampler();
    }

    @Bean
    public AlignmentSamplingService alignmentSamplingService(ChainageSampler chainageSampler) {
        return new AlignmentSamplingService(chainageSampler);
    }

    @Bean
    public LandXmlImportQueries landXmlImportQueries(LandXmlImportRepository landXmlImportRepository) {
        return new LandXmlImportQueries(landXmlImportRepository);
    }

    @Bean
    public LongitudinalProfileService longitudinalProfileService(TerrainQueryService terrainQueryService,
            ChainageSampler chainageSampler) {
        return new LongitudinalProfileService(terrainQueryService, chainageSampler);
    }

    @Bean
    public TerrainImportUseCase terrainImportUseCase(TerrainImportService terrainImportService,
            TerrainRepository terrainRepository) {
        return new TerrainImportUseCase(terrainImportService, terrainRepository);
    }

    @Bean
    public TerrainReadService terrainReadService(TerrainRepository terrainRepository,
            TerrainQueryService terrainQueryService) {
        return new TerrainReadService(terrainRepository, terrainQueryService);
    }

    @Bean
    public TrafficResolveUseCase trafficResolveUseCase(TrafficLoadsService trafficLoadsService) {
        return new TrafficResolveUseCase(trafficLoadsService);
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
