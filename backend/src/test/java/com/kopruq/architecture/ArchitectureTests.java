package com.kopruq.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Stream;

import static com.kopruq.architecture.ArchitectureRules.files;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Package-boundary tests of the single-module modular monolith (docs/architecture/backend-reference.md R1, R3, R4).
 * Plain JUnit - no ArchUnit dependency. The first block runs the rules on the real source tree; the second proves
 * that every rule can fail (a violating input is caught) and can pass (a clean input is accepted).
 */
class ArchitectureTests {

    // ------------------------------------------------------------ real tree

    private static Path backendDir() {
        Path dir = Path.of("").toAbsolutePath();
        while (dir != null) {
            Path pom = dir.resolve("pom.xml");
            if (Files.isDirectory(dir.resolve("src/main/java/com/kopruq")) && Files.isRegularFile(pom)
                    && read(pom).contains("<artifactId>kopruq-backend</artifactId>")) {
                return dir;
            }
            Path nested = dir.resolve("backend");
            if (Files.isDirectory(nested.resolve("src/main/java/com/kopruq")) && Files.isRegularFile(nested.resolve("pom.xml"))) {
                return nested;
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException("backend/src/main/java/com/kopruq not found above " + Path.of("").toAbsolutePath());
    }

    private static String read(Path file) {
        try {
            return Files.readString(file, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Map<String, String> mainSources() throws IOException {
        Path root = backendDir().resolve("src/main/java");
        Map<String, String> sources = new TreeMap<>();
        try (Stream<Path> paths = Files.walk(root)) {
            for (Path file : paths.filter(p -> p.toString().endsWith(".java")).toList()) {
                sources.put(root.relativize(file).toString().replace('\\', '/'), read(file));
            }
        }
        assertTrue(sources.size() > 200, "expected the whole main tree, found " + sources.size() + " files");
        return sources;
    }

    @Test
    void everyMainPackage_isAnAllowedLocation() throws IOException {
        assertEquals(List.of(), ArchitectureRules.locationViolations(mainSources()));
    }

    @Test
    void coreLayers_doNotDependOnSpringApplicationApiOrInfra() throws IOException {
        assertEquals(List.of(), ArchitectureRules.coreIsolationViolations(mainSources()));
    }

    @Test
    void coreLayers_importOnlyTheAllowList() throws IOException {
        assertEquals(List.of(), ArchitectureRules.coreAllowListViolations(mainSources()));
    }

    @Test
    void domainEdges_equalThePinnedGraph() throws IOException {
        Map<String, String> sources = mainSources();
        assertEquals(List.of(), ArchitectureRules.edgeViolations(
                ArchitectureRules.domainEdges(sources, true), ArchitectureRules.CORE_DEPS, "core layers"));
        Map<String, Set<String>> pinned = new TreeMap<>(ArchitectureRules.DOMAIN_DEPS);
        pinned.putAll(ArchitectureRules.SHARED_DEPS);
        assertEquals(List.of(), ArchitectureRules.edgeViolations(
                ArchitectureRules.domainEdges(sources, false), pinned, "all layers"));
    }

    @Test
    void externalImports_onlyWhereAllowed() throws IOException {
        assertEquals(List.of(), ArchitectureRules.externalImportViolations(mainSources()));
    }

    @Test
    void persistenceTypes_onlyInInfraPersistence() throws IOException {
        assertEquals(List.of(), ArchitectureRules.persistenceImportViolations(mainSources()));
    }

    @Test
    void solverSpecificCode_onlyInAnalysisInfra() throws IOException {
        assertEquals(List.of(), ArchitectureRules.solverViolations(mainSources()));
    }

    @Test
    void restControllers_onlyInDomainApi_andExactlyFourteen() throws IOException {
        Map<String, String> sources = mainSources();
        assertEquals(List.of(), ArchitectureRules.controllerLocationViolations(sources));
        assertEquals(14, ArchitectureRules.restControllers(sources).size(), "expected the 14 controllers");
    }

    @Test
    void noCrossOrigin_andNoControllerBuildsCollaboratorsWithNew() throws IOException {
        assertEquals(List.of(), ArchitectureRules.controllerStyleViolations(mainSources()));
    }

    @Test
    void applicationDoesNotImportApi() throws IOException {
        assertEquals(List.of(), ArchitectureRules.applicationDependsOnApiViolations(mainSources()));
    }

    @Test
    void pom_isOneModuleWithExactlyTheApprovedDependencies() {
        assertEquals(List.of(), ArchitectureRules.pomViolations(read(backendDir().resolve("pom.xml"))));
    }

    // ------------------------------------------------------ synthetic inputs

    private static String src(String pkg, String... imports) {
        StringBuilder sb = new StringBuilder("package ").append(pkg).append(";\n\n");
        for (String i : imports) {
            sb.append("import ").append(i).append(";\n");
        }
        return sb.append("\npublic class X {}\n").toString();
    }

    private static Map<String, String> one(String pkg, String... imports) {
        return files("com/kopruq/F.java", src(pkg, imports));
    }

    @Test
    void importParsing_handlesStaticWildcardAndNestedTypes() {
        assertEquals(List.of("a.b.C", "a.b.D.E", "a.b.*", "a.b.C.m"),
                ArchitectureRules.imports("package p;\nimport a.b.C;\nimport a.b.D.E;\nimport a.b.*;\nimport static a.b.C.m;\n"));
        assertEquals("com.kopruq.bridge.model", ArchitectureRules.packageOfImport("com.kopruq.bridge.model.Bridge"));
        assertEquals("com.kopruq.bridge.model", ArchitectureRules.packageOfImport("com.kopruq.bridge.model.Bridge.Inner"));
        assertEquals("com.kopruq.bridge.model", ArchitectureRules.packageOfImport("com.kopruq.bridge.model.*"));
    }

    @Test
    void t1_unknownDomainLayerOrSubPackage_isCaught_andAllowedLocationsPass() {
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq.unknown.model")).size());
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq.bridge.service")).size());
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq.bridge.model.sub")).size());
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq.shared.geometry")).size());
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq")).size());
        assertEquals(1, ArchitectureRules.locationViolations(files("com/kopruq/bridge/Bridge.java", src("com.kopruq.bridge"))).size());
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq.api.terrain.api")).size());
        assertEquals(1, ArchitectureRules.locationViolations(one("com.kopruq.midas")).size());
        assertEquals(List.of(), ArchitectureRules.locationViolations(one("com.kopruq.bridge.model")));
        assertEquals(List.of(), ArchitectureRules.locationViolations(one("com.kopruq.analysis.infra.midas")));
        assertEquals(List.of(), ArchitectureRules.locationViolations(one("com.kopruq.shared.exception")));
        assertEquals(List.of(), ArchitectureRules.locationViolations(
                files("com/kopruq/KopruqApplication.java", src("com.kopruq"),
                        "com/kopruq/bridge/package-info.java", "package com.kopruq.bridge;\n")));
    }

    @Test
    void t2_springJakartaLombokAndUpperLayerImports_inCoreLayers_areCaught() {
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "org.springframework.stereotype.Component")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.domain", "jakarta.validation.Valid")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.enums", "lombok.Data")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "com.kopruq.terrain.application.TerrainRepository")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "com.kopruq.terrain.api.TerrainController")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "com.kopruq.terrain.infra.InMemoryTerrainRepository")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "com.kopruq.shared.config.CoreConfiguration")).size());
        // jakarta.persistence / Hibernate are no longer open to the core layers: entities live in infra.persistence
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "jakarta.persistence.Entity")).size());
        assertEquals(1, ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.domain", "org.hibernate.annotations.Type")).size());
        // clean: application/api/infra may use Spring; a core layer with plain java imports is fine
        assertEquals(List.of(), ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.application", "org.springframework.stereotype.Service")));
        assertEquals(List.of(), ArchitectureRules.coreIsolationViolations(one("com.kopruq.bridge.model", "java.util.List")));
    }

    @Test
    void t3_coreImportsOutsideTheAllowList_areCaught_andAllowedImportsPass() {
        assertEquals(1, ArchitectureRules.coreAllowListViolations(one("com.kopruq.bridge.model", "org.apache.commons.lang3.StringUtils")).size());
        assertEquals(1, ArchitectureRules.coreAllowListViolations(one("com.kopruq.bridge.model", "com.kopruq.terrain.model.TerrainModel")).size());
        assertEquals(1, ArchitectureRules.coreAllowListViolations(one("com.kopruq.bridge.model", "org.locationtech.jts.geom.Polygon")).size());
        assertEquals(1, ArchitectureRules.coreAllowListViolations(one("com.kopruq.terrain.model", "org.locationtech.jts.geom.Polygon")).size());
        assertEquals(List.of(), ArchitectureRules.coreAllowListViolations(one("com.kopruq.bridge.model", "java.util.List", "com.kopruq.bridge.enums.FoundationType", "com.kopruq.bridge.domain.Helper")));
        assertEquals(List.of(), ArchitectureRules.coreAllowListViolations(one("com.kopruq.terrain.domain", "org.locationtech.jts.geom.Polygon", "com.kopruq.geometry.model.Point3D")));
        assertEquals(List.of(), ArchitectureRules.coreAllowListViolations(one("com.kopruq.landxml.domain", "javax.xml.parsers.DocumentBuilder", "com.kopruq.terrain.model.TerrainModel")));
        assertEquals(List.of(), ArchitectureRules.coreAllowListViolations(one("com.kopruq.bridge.application", "com.kopruq.terrain.model.TerrainModel")));
    }

    @Test
    void t4_undeclaredAndUnusedDomainEdges_areCaught() {
        Map<String, Set<String>> pinned = Map.of("bridge", Set.of(), "rules", Set.of("bridge"));
        Map<String, String> undeclared = files(
                "com/kopruq/a/A.java", src("com.kopruq.bridge.model", "com.kopruq.rules.model.RuleOutcome"),
                "com/kopruq/b/B.java", src("com.kopruq.rules.domain", "com.kopruq.bridge.model.Bridge"));
        assertEquals(1, ArchitectureRules.edgeViolations(ArchitectureRules.domainEdges(undeclared, false), pinned, "t").size());
        Map<String, String> unused = files("com/kopruq/b/B.java", src("com.kopruq.rules.domain", "java.util.List"));
        List<String> unusedViolations = ArchitectureRules.edgeViolations(ArchitectureRules.domainEdges(unused, false), pinned, "t");
        assertEquals(1, unusedViolations.size());
        assertTrue(unusedViolations.get(0).contains("not used"));
        Map<String, String> exact = files("com/kopruq/b/B.java", src("com.kopruq.rules.domain", "com.kopruq.bridge.model.Bridge"));
        assertEquals(List.of(), ArchitectureRules.edgeViolations(ArchitectureRules.domainEdges(exact, false), pinned, "t"));
        // layers: an api-only edge is invisible to the core graph
        Map<String, String> apiOnly = files("com/kopruq/b/B.java", src("com.kopruq.rules.api", "com.kopruq.bridge.model.Bridge"));
        assertEquals(Map.of(), ArchitectureRules.domainEdges(apiOnly, true).entrySet().stream()
                .filter(e -> !e.getValue().isEmpty()).collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
        // the pinned maps themselves stay consistent: core edges are a subset of all-layer edges
        for (Map.Entry<String, Set<String>> core : ArchitectureRules.CORE_DEPS.entrySet()) {
            assertTrue(ArchitectureRules.DOMAIN_DEPS.get(core.getKey()).containsAll(core.getValue()), core.getKey());
        }
    }

    @Test
    void t5_unapprovedExternalImports_areCaught_andApprovedOnesPass() {
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.bridge.api", "org.apache.commons.lang3.StringUtils")).size());
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.bridge.model", "org.springframework.stereotype.Component")).size());
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.shared.validation", "org.springframework.http.HttpStatus")).size());
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.analysis.infra.nativeengine", "com.fasterxml.jackson.databind.ObjectMapper")).size());
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.analysis.infra.midas", "org.springframework.stereotype.Component")).size());
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.analysis.infra.midas", "com.kopruq.materials.domain.EurocodeConcrete")).size());
        assertEquals(1, ArchitectureRules.externalImportViolations(one("com.kopruq.analysis.infra.nativeengine", "com.kopruq.analysis.infra.midas.MidasApiClient")).size());
        assertEquals(List.of(), ArchitectureRules.externalImportViolations(one("com.kopruq.bridge.api", "org.springframework.web.bind.annotation.RestController", "com.fasterxml.jackson.annotation.JsonProperty")));
        assertEquals(List.of(), ArchitectureRules.externalImportViolations(one("com.kopruq.terrain.infra", "org.springframework.stereotype.Repository")));
        assertEquals(List.of(), ArchitectureRules.externalImportViolations(one("com.kopruq.shared.config", "org.springframework.context.annotation.Bean")));
        assertEquals(List.of(), ArchitectureRules.externalImportViolations(one("com.kopruq.analysis.infra.midas", "com.fasterxml.jackson.databind.ObjectMapper", "com.kopruq.analysis.model.AnalysisNode", "com.kopruq.analysis.application.AnalysisEngine", "java.net.http.HttpClient")));
        assertEquals(List.of(), ArchitectureRules.externalImportViolations(one("com.kopruq.analysis.infra.nativeengine", "java.util.List", "com.kopruq.analysis.enums.MaterialKind")));
    }

    @Test
    void t6_midasAndOtherSolverTypes_outsideAnalysisInfra_areCaught() {
        assertEquals(1, ArchitectureRules.solverViolations(one("com.kopruq.analysis.api", "com.kopruq.analysis.infra.midas.MidasApiClient")).size());
        assertEquals(1, ArchitectureRules.solverViolations(one("com.kopruq.bridge.model", "com.kopruq.analysis.infra.midas.MidasVocabulary")).size());
        assertEquals(1, ArchitectureRules.solverViolations(one("com.kopruq.rules.domain", "com.vendor.scia.Engine")).size());
        assertEquals(1, ArchitectureRules.solverViolations(one("com.kopruq.generative.domain", "com.vendor.allplan.Api")).size());
        assertEquals(1, ArchitectureRules.solverViolations(one("com.kopruq.analysis.infra.nativeengine", "com.kopruq.analysis.infra.midas.MidasApiClient")).size());
        assertEquals(List.of(), ArchitectureRules.solverViolations(one("com.kopruq.analysis.infra.midas", "com.kopruq.analysis.infra.midas.MidasApiClient")));
        assertEquals(List.of(), ArchitectureRules.solverViolations(one("com.kopruq.shared.config", "com.kopruq.analysis.infra.midas.MidasCivilNxAnalysisEngine")));
        assertEquals(List.of(), ArchitectureRules.solverViolations(one("com.kopruq.analysis.application", "com.kopruq.analysis.model.AnalysisNode")));
    }

    @Test
    void t7_restControllerOutsideADomainApiPackage_isCaught_andCounted() {
        String controller = "package com.kopruq.bridge.%s;\n\n@RestController\npublic class C {}\n";
        assertEquals(1, ArchitectureRules.controllerLocationViolations(files("C.java", controller.formatted("application"))).size());
        assertEquals(1, ArchitectureRules.controllerLocationViolations(files("C.java", controller.formatted("model"))).size());
        assertEquals(1, ArchitectureRules.controllerLocationViolations(
                files("C.java", "package com.kopruq.shared.config;\n\n@RestController\npublic class C {}\n")).size());
        assertEquals(List.of(), ArchitectureRules.controllerLocationViolations(files("C.java", controller.formatted("api"))));
        assertEquals(List.of(), ArchitectureRules.controllerLocationViolations(
                files("A.java", "package com.kopruq.shared.exception;\n\n@RestControllerAdvice\npublic class A {}\n")));
        assertEquals(List.of("C.java"), ArchitectureRules.restControllers(files("C.java", controller.formatted("api"),
                "A.java", "package com.kopruq.shared.exception;\n\n@RestControllerAdvice\npublic class A {}\n")));
    }

    @Test
    void t8_crossOriginAndNewCollaboratorFields_areCaught() {
        assertTrue(ArchitectureRules.usesCrossOrigin("@CrossOrigin(origins = \"http://localhost:5173\")"));
        assertTrue(ArchitectureRules.usesCrossOrigin("import org.springframework.web.bind.annotation.CrossOrigin;"));
        assertFalse(ArchitectureRules.usesCrossOrigin(" * that every controller used to carry: @CrossOrigin(origins = x)"));
        assertTrue(ArchitectureRules.buildsCollaboratorWithNew("    private final FastSolverModelBuilder modelBuilder = new FastSolverModelBuilder();"));
        assertTrue(ArchitectureRules.buildsCollaboratorWithNew("    private final TerrainImportService importService = new TerrainImportService();"));
        assertFalse(ArchitectureRules.buildsCollaboratorWithNew("    private final TerrainRepository repository;"));
        assertFalse(ArchitectureRules.buildsCollaboratorWithNew("        List<String> warnings = new ArrayList<>();"));
        assertEquals(1, ArchitectureRules.controllerStyleViolations(files("C.java",
                "package com.kopruq.bridge.api;\n@RestController\nclass C {\n    private final TerrainImportService s = new TerrainImportService();\n}\n")).size());
        assertEquals(1, ArchitectureRules.controllerStyleViolations(files("C.java",
                "package com.kopruq.bridge.api;\n@CrossOrigin\n@RestController\nclass C {}\n")).size());
        assertEquals(List.of(), ArchitectureRules.controllerStyleViolations(files("C.java",
                "package com.kopruq.bridge.api;\n@RestController\nclass C {\n    private final TerrainReadService s;\n}\n")));
    }

    @Test
    void t9_applicationImportingAnApiPackage_isCaught() {
        assertEquals(1, ArchitectureRules.applicationDependsOnApiViolations(one("com.kopruq.terrain.application", "com.kopruq.terrain.api.TerrainImportResponse")).size());
        assertEquals(1, ArchitectureRules.applicationDependsOnApiViolations(one("com.kopruq.terrain.application", "com.kopruq.landxml.api.LandXmlController")).size());
        assertEquals(List.of(), ArchitectureRules.applicationDependsOnApiViolations(one("com.kopruq.terrain.application", "com.kopruq.terrain.model.TerrainModel")));
        assertEquals(List.of(), ArchitectureRules.applicationDependsOnApiViolations(one("com.kopruq.terrain.api", "com.kopruq.terrain.application.TerrainReadService")));
    }

    @Test
    void t11_persistenceImportsOutsideInfraPersistence_areCaught_andInfraPersistencePasses() {
        assertEquals(1, ArchitectureRules.persistenceImportViolations(one("com.kopruq.bridge.model", "jakarta.persistence.Entity")).size());
        assertEquals(1, ArchitectureRules.persistenceImportViolations(one("com.kopruq.bridge.application", "org.springframework.data.jpa.repository.JpaRepository")).size());
        assertEquals(1, ArchitectureRules.persistenceImportViolations(one("com.kopruq.bridge.api", "org.hibernate.annotations.Type")).size());
        assertEquals(1, ArchitectureRules.persistenceImportViolations(one("com.kopruq.analysis.infra.midas", "jakarta.persistence.Id")).size());
        assertEquals(1, ArchitectureRules.persistenceImportViolations(one("com.kopruq.shared.config", "jakarta.persistence.EntityManager")).size());
        // clean: the persistence adapter package, and non-persistence framework imports elsewhere
        assertEquals(List.of(), ArchitectureRules.persistenceImportViolations(
                one("com.kopruq.bridge.infra.persistence", "jakarta.persistence.Entity", "org.springframework.data.jpa.repository.JpaRepository", "org.hibernate.annotations.Type")));
        assertEquals(List.of(), ArchitectureRules.persistenceImportViolations(one("com.kopruq.bridge.application", "org.springframework.stereotype.Service")));
        // and the persistence package itself is an allowed location
        assertEquals(List.of(), ArchitectureRules.locationViolations(one("com.kopruq.bridge.infra.persistence", "jakarta.persistence.Entity")));
    }

    private static String pom(String packaging, String modules, String dependencies) {
        return "<project>\n<groupId>com.kopruq</groupId>\n<artifactId>kopruq-backend</artifactId>\n<packaging>" + packaging
                + "</packaging>\n" + modules + "<dependencyManagement><dependencies><dependency><groupId>x</groupId>"
                + "<artifactId>bom</artifactId></dependency></dependencies></dependencyManagement>\n<dependencies>" + dependencies
                + "</dependencies>\n<build><plugins><plugin><groupId>p</groupId><artifactId>q</artifactId></plugin></plugins></build>\n</project>";
    }

    private static String dep(String group, String artifact, String scope) {
        return "<dependency><groupId>" + group + "</groupId><artifactId>" + artifact + "</artifactId>"
                + (scope == null ? "" : "<scope>" + scope + "</scope>") + "</dependency>";
    }

    private static final String APPROVED = dep("org.springframework.boot", "spring-boot-starter-web", null)
            + dep("org.springframework.boot", "spring-boot-starter-actuator", null)
            + dep("org.locationtech.jts", "jts-core", null)
            + dep("com.fasterxml.jackson.core", "jackson-databind", null)
            + dep("org.springframework.boot", "spring-boot-starter-test", "test")
            + dep("org.junit.jupiter", "junit-jupiter", "test")
            + dep("org.springframework.boot", "spring-boot-starter-data-jpa", null)
            + dep("org.flywaydb", "flyway-core", null)
            + dep("org.flywaydb", "flyway-database-postgresql", "runtime")
            + dep("org.postgresql", "postgresql", "runtime")
            + dep("com.h2database", "h2", "test");

    @Test
    void t10_pomWithModulesWrongPackagingOrOtherDependencies_isCaught() {
        assertEquals(List.of(), ArchitectureRules.pomViolations(pom("jar", "", APPROVED)));
        assertEquals(1, ArchitectureRules.pomViolations(pom("jar", "<modules><module>a</module></modules>\n", APPROVED)).size());
        assertEquals(1, ArchitectureRules.pomViolations(pom("pom", "", APPROVED)).size());
        assertEquals(1, ArchitectureRules.pomViolations(pom("jar", "", APPROVED + dep("org.apache.commons", "commons-lang3", null))).size());
        assertEquals(1, ArchitectureRules.pomViolations(pom("jar", "", APPROVED.replace(dep("org.locationtech.jts", "jts-core", null), ""))).size());
        // a dependency that is only moved to the wrong scope is neither the approved one nor missing
        assertEquals(2, ArchitectureRules.pomViolations(pom("jar", "", APPROVED.replace(dep("org.junit.jupiter", "junit-jupiter", "test"),
                dep("org.junit.jupiter", "junit-jupiter", null)))).size());
    }
}
