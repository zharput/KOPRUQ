package com.kopruq.api.architecture;

import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 9: the module boundaries are checked by the build, not by convention.
 * Plain JUnit over the real {@code backend/} tree (no ArchUnit / enforcer dependency); the rules themselves
 * live in {@link ModuleBoundaryRules} and are tested with synthetic input below.
 */
class ModuleBoundaryTest {

    private static final String API = "api";

    /**
     * Declared-but-unused internal edges that are KNOWN and deliberately left alone, as "module -> dependency". Empty
     * since BACKEND-ARCHITECTURE Faz 6: generative-engine now uses rules-engine (EvaluatedAlternativeGenerator). Add an
     * entry only deliberately, and remove it when the edge is either used or deleted.
     */
    private static final Set<String> KNOWN_UNUSED_EDGES = Set.of();

    /**
     * BACKEND-ARCHITECTURE Faz 0: the module graph, pinned exactly (module -> direct internal pom dependencies,
     * test scope excluded). A new module or edge must be added here deliberately.
     */
    private static final Map<String, Set<String>> ALLOWED_INTERNAL_DEPENDENCIES = Map.ofEntries(
            Map.entry("spatial-core", Set.of()),
            Map.entry("alignment", Set.of("spatial-core")),
            Map.entry("terrain", Set.of("spatial-core")),
            Map.entry("landxml-import", Set.of("spatial-core", "alignment", "terrain")),
            Map.entry("traffic-loads", Set.of()),
            Map.entry("materials", Set.of()),
            Map.entry("environmental-loads", Set.of()),
            Map.entry("constraints", Set.of()),
            Map.entry("bridge-layout", Set.of("alignment", "constraints")),
            Map.entry("bridge-core", Set.of()),
            Map.entry("rules-engine", Set.of("bridge-core")),
            Map.entry("generative-engine", Set.of("bridge-core", "rules-engine")),
            Map.entry("analysis-api", Set.of()),
            Map.entry("analysis-engine", Set.of("analysis-api")),
            Map.entry("model-builder", Set.of("analysis-api", "materials")),
            Map.entry("midas-adapter", Set.of("analysis-api")),
            Map.entry("api", Set.of("bridge-core", "rules-engine", "generative-engine", "analysis-api", "spatial-core",
                    "alignment", "terrain", "landxml-import", "traffic-loads", "materials", "environmental-loads", "constraints",
                    "bridge-layout", "analysis-engine", "model-builder")));

    // ---- the real tree

    @Test
    void everyModule_declaresExactlyItsAllowedInternalDependencies() throws Exception {
        Path backend = findBackendRoot();
        Map<String, Set<String>> actual = new LinkedHashMap<>();
        for (String module : moduleNames(backend)) {
            actual.put(module, new HashSet<>(dependencies(parse(backend.resolve(module).resolve("pom.xml")), true)));
        }
        assertEquals(List.of(), ModuleBoundaryRules.graphViolations(actual, ALLOWED_INTERNAL_DEPENDENCIES),
                "module dependency graph differs from the pinned one");
    }

    @Test
    void scanner_flagsAnUnknownModuleAnExtraEdgeAndAMissingEdge() {
        Map<String, Set<String>> allowed = Map.of("a", Set.of(), "b", Set.of("a"));
        assertEquals(List.of(), ModuleBoundaryRules.graphViolations(Map.of("a", Set.of(), "b", Set.of("a")), allowed));
        assertEquals(1, ModuleBoundaryRules.graphViolations(Map.of("a", Set.of(), "b", Set.of("a"), "c", Set.of()), allowed).size());
        assertEquals(1, ModuleBoundaryRules.graphViolations(Map.of("a", Set.of("b"), "b", Set.of("a")), allowed).size());
        assertEquals(1, ModuleBoundaryRules.graphViolations(Map.of("a", Set.of(), "b", Set.of()), allowed).size());
        assertEquals(1, ModuleBoundaryRules.graphViolations(Map.of("a", Set.of()), allowed).size());
    }

    @Test
    void everyModule_respectsTheBoundaries() throws Exception {
        Path backend = findBackendRoot();
        List<String> modules = moduleNames(backend);
        assertTrue(modules.contains(API) && modules.size() >= 10, "module list not read correctly: " + modules);

        Map<String, List<String>> internalDeps = new HashMap<>();
        Map<String, List<String>> groupIds = new HashMap<>();
        Map<String, Map<String, String>> sources = new HashMap<>();
        Map<String, String> ownerOfRoot = new HashMap<>();
        for (String module : modules) {
            Document pom = parse(backend.resolve(module).resolve("pom.xml"));
            internalDeps.put(module, dependencies(pom, true));
            groupIds.put(module, dependencies(pom, false));
            sources.put(module, readJavaSources(backend.resolve(module).resolve("src/main/java")));
            for (String source : sources.get(module).values()) {
                String root = ModuleBoundaryRules.packageRoot(source);
                if (root != null) {
                    String previous = ownerOfRoot.putIfAbsent(root, module);
                    assertTrue(previous == null || previous.equals(module),
                            "package com.kopruq." + root + " is declared by two modules: " + previous + " and " + module);
                }
            }
        }

        List<String> violations = new ArrayList<>();
        for (String module : modules) {
            boolean isApi = module.equals(API);
            Set<String> allowedRoots = new HashSet<>();
            for (String reachable : transitiveClosure(module, internalDeps)) {
                ownerOfRoot.forEach((root, owner) -> {
                    if (owner.equals(reachable)) {
                        allowedRoots.add(root);
                    }
                });
            }
            violations.addAll(ModuleBoundaryRules.pomViolations(module, groupIds.get(module), isApi));
            violations.addAll(ModuleBoundaryRules.violations(module, sources.get(module), allowedRoots, isApi));
        }
        assertEquals(List.of(), violations, "module boundary violations");
    }

    @Test
    void noModuleDeclaresAnInternalDependencyItDoesNotUse() throws Exception {
        Path backend = findBackendRoot();
        List<String> modules = moduleNames(backend);
        Map<String, Set<String>> rootsByModule = new HashMap<>();
        Map<String, List<String>> allSources = new HashMap<>();
        for (String module : modules) {
            Map<String, String> main = readJavaSources(backend.resolve(module).resolve("src/main/java"));
            Map<String, String> test = readJavaSources(backend.resolve(module).resolve("src/test/java"));
            Set<String> roots = new HashSet<>();
            for (String source : main.values()) {
                String root = ModuleBoundaryRules.packageRoot(source);
                if (root != null) {
                    roots.add(root);
                }
            }
            rootsByModule.put(module, roots);
            List<String> all = new ArrayList<>(main.values());
            all.addAll(test.values());
            allSources.put(module, all);
        }
        List<String> violations = new ArrayList<>();
        for (String module : modules) {
            List<String> declared = dependencies(parse(backend.resolve(module).resolve("pom.xml")), true);
            for (String violation : ModuleBoundaryRules.unusedDependencies(module, declared, rootsByModule, allSources.get(module))) {
                boolean known = KNOWN_UNUSED_EDGES.stream().anyMatch(edge -> {
                    String[] parts = edge.split(" -> ");
                    return violation.startsWith(parts[0] + ":") && violation.contains("'" + parts[1] + "'");
                });
                if (!known) {
                    violations.add(violation);
                }
            }
        }
        assertEquals(List.of(), violations, "unused internal module dependencies");
    }

    @Test
    void scanner_flagsAnUnusedInternalDependency() {
        Map<String, Set<String>> roots = Map.of("bridge-core", Set.of("bridgecore"), "analysis-api", Set.of("analysis"));
        List<String> sources = List.of("package com.kopruq.midas;\nimport com.kopruq.analysis.AnalysisRequest;\n");
        List<String> v = ModuleBoundaryRules.unusedDependencies("midas-adapter", List.of("bridge-core", "analysis-api"), roots, sources);
        assertEquals(1, v.size());
        assertTrue(v.get(0).contains("'bridge-core'"));
        assertEquals(List.of(), ModuleBoundaryRules.unusedDependencies("midas-adapter", List.of("analysis-api"), roots, sources));
    }

    @Test
    void onlyApiDependsOnSpring() throws Exception {
        Path backend = findBackendRoot();
        for (String module : moduleNames(backend)) {
            List<String> springDeps = dependencies(parse(backend.resolve(module).resolve("pom.xml")), false).stream()
                    .filter(g -> g.startsWith("org.springframework")).toList();
            if (module.equals(API)) {
                assertFalse(springDeps.isEmpty(), "api is expected to be the Spring Boot module");
            } else {
                assertEquals(List.of(), springDeps, module);
            }
        }
    }

    // ---- the scanner itself is tested with synthetic input (a rule that cannot fail proves nothing)

    @Test
    void scanner_flagsAFrameworkImportOutsideApi() {
        Map<String, String> sources = Map.of("Bad.java", "package com.kopruq.rules;\nimport org.springframework.stereotype.Component;\nclass Bad {}\n");
        List<String> v = ModuleBoundaryRules.violations("rules-engine", sources, Set.of("rules", "bridgecore"), false);
        assertEquals(1, v.size());
        assertTrue(v.get(0).contains("org.springframework.stereotype.Component"));
    }

    @Test
    void scanner_flagsJakartaAndLombok_butAllowsThemInApi() {
        Map<String, String> sources = Map.of("A.java", "import jakarta.servlet.Filter;\nimport lombok.Data;\nimport static lombok.val;\n");
        assertEquals(3, ModuleBoundaryRules.violations("terrain", sources, Set.of("terrain"), false).size());
        assertEquals(0, ModuleBoundaryRules.violations("api", sources, Set.of("api"), true).size());
    }

    @Test
    void scanner_flagsMidasInTheMidasFreeModules_only() {
        Map<String, String> sources = Map.of("B.java", "import com.kopruq.midas.MidasApiClient;\n");
        assertEquals(1, ModuleBoundaryRules.violations("bridge-core", sources, Set.of("bridgecore", "midas"), false).size());
        assertEquals(1, ModuleBoundaryRules.violations("generative-engine", sources, Set.of("generative", "midas"), false).size());
        assertEquals(1, ModuleBoundaryRules.violations("analysis-api", sources, Set.of("analysis", "midas"), false).size());
        assertEquals(0, ModuleBoundaryRules.violations("midas-adapter", sources, Set.of("midas"), false).size());
        assertEquals(0, ModuleBoundaryRules.violations("api", sources, Set.of("api", "midas"), true).size());
    }

    @Test
    void scanner_flagsAnImportOfAModuleThatThePomDoesNotDeclare() {
        Map<String, String> sources = Map.of("C.java", "import com.kopruq.bridgecore.Bridge;\nimport com.kopruq.analysis.AnalysisRequest;\n");
        List<String> v = ModuleBoundaryRules.violations("analysis-engine", sources, Set.of("analysisengine", "analysis"), false);
        assertEquals(1, v.size());
        assertTrue(v.get(0).contains("com.kopruq.bridgecore.Bridge"));
    }

    @Test
    void scanner_acceptsACleanModule_andPomRuleFlagsSpring() {
        Map<String, String> sources = Map.of("D.java", "package com.kopruq.alignment;\nimport java.util.List;\nimport com.kopruq.spatialcore.Point3D;\n");
        assertEquals(List.of(), ModuleBoundaryRules.violations("alignment", sources, Set.of("alignment", "spatialcore"), false));
        assertEquals(1, ModuleBoundaryRules.pomViolations("terrain", List.of("org.locationtech.jts", "org.springframework.boot"), false).size());
        assertEquals(0, ModuleBoundaryRules.pomViolations("api", List.of("org.springframework.boot"), true).size());
    }

    // ---- helpers

    private static Path findBackendRoot() throws IOException {
        Path dir = Path.of("").toAbsolutePath();
        while (dir != null) {
            Path pom = dir.resolve("pom.xml");
            if (Files.isRegularFile(pom) && Files.readString(pom, StandardCharsets.UTF_8).contains("<modules>")) {
                return dir;
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException("backend/pom.xml (with <modules>) was not found above " + Path.of("").toAbsolutePath());
    }

    private static Document parse(Path pom) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        return factory.newDocumentBuilder().parse(pom.toFile());
    }

    private static List<String> moduleNames(Path backend) throws Exception {
        Document root = parse(backend.resolve("pom.xml"));
        NodeList nodes = root.getElementsByTagName("module");
        List<String> modules = new ArrayList<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            modules.add(nodes.item(i).getTextContent().trim());
        }
        return modules;
    }

    /** Direct, non-test dependencies: the artifactIds of com.kopruq modules (internalOnly) or all groupIds. */
    private static List<String> dependencies(Document pom, boolean internalOnly) {
        List<String> result = new ArrayList<>();
        Element project = pom.getDocumentElement();
        NodeList children = project.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element element && element.getTagName().equals("dependencies")) {
                NodeList deps = element.getElementsByTagName("dependency");
                for (int d = 0; d < deps.getLength(); d++) {
                    Element dep = (Element) deps.item(d);
                    String groupId = text(dep, "groupId");
                    String scope = text(dep, "scope");
                    if ("test".equals(scope)) {
                        continue;
                    }
                    if (internalOnly) {
                        if ("com.kopruq".equals(groupId)) {
                            result.add(text(dep, "artifactId"));
                        }
                    } else {
                        result.add(groupId);
                    }
                }
            }
        }
        return result;
    }

    private static String text(Element parent, String tag) {
        NodeList list = parent.getElementsByTagName(tag);
        return list.getLength() == 0 ? "" : list.item(0).getTextContent().trim();
    }

    private static Set<String> transitiveClosure(String module, Map<String, List<String>> deps) {
        Set<String> seen = new HashSet<>();
        List<String> todo = new ArrayList<>(List.of(module));
        while (!todo.isEmpty()) {
            String next = todo.remove(todo.size() - 1);
            if (seen.add(next)) {
                todo.addAll(deps.getOrDefault(next, List.of()));
            }
        }
        return seen;
    }

    private static Map<String, String> readJavaSources(Path dir) throws IOException {
        Map<String, String> sources = new LinkedHashMap<>();
        if (!Files.isDirectory(dir)) {
            return sources;
        }
        try (Stream<Path> files = Files.walk(dir)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                sources.put(dir.relativize(file).toString().replace('\\', '/'), Files.readString(file, StandardCharsets.UTF_8));
            }
        }
        return sources;
    }
}
