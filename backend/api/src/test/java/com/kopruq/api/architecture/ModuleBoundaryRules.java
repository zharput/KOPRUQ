package com.kopruq.api.architecture;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The module-boundary rules (docs/architecture/backend-reference.md R3, CLAUDE.md architectural rules) as pure
 * functions over file contents, so the rules themselves can be tested with synthetic input
 * ({@link ModuleBoundaryTest}) without touching the real source tree.
 */
final class ModuleBoundaryRules {

    private static final Pattern IMPORT = Pattern.compile("^\\s*import\\s+(?:static\\s+)?([\\w.]+)", Pattern.MULTILINE);
    private static final Pattern PACKAGE = Pattern.compile("^\\s*package\\s+([\\w.]+)\\s*;", Pattern.MULTILINE);
    private static final String KOPRUQ_PREFIX = "com.kopruq.";

    /** Import prefixes that only the {@code api} module may use. */
    static final List<String> FRAMEWORK_PREFIXES = List.of("org.springframework.", "jakarta.", "lombok.");

    /** Modules that must know nothing about the MIDAS adapter. */
    static final Set<String> MIDAS_FREE_MODULES = Set.of("bridge-core", "rules-engine", "generative-engine");

    private ModuleBoundaryRules() {
    }

    /** All imported type names of a Java source text. */
    static List<String> imports(String source) {
        List<String> imports = new ArrayList<>();
        Matcher m = IMPORT.matcher(source);
        while (m.find()) {
            imports.add(m.group(1));
        }
        return imports;
    }

    /** The first package segment below {@code com.kopruq.}, or null if the file declares no such package. */
    static String packageRoot(String source) {
        Matcher m = PACKAGE.matcher(source);
        if (m.find() && m.group(1).startsWith(KOPRUQ_PREFIX)) {
            String rest = m.group(1).substring(KOPRUQ_PREFIX.length());
            int dot = rest.indexOf('.');
            return dot < 0 ? rest : rest.substring(0, dot);
        }
        return null;
    }

    /**
     * Violations of one module's main sources.
     *
     * @param module          the module's artifact id (e.g. {@code bridge-core})
     * @param sources         file name -> file content of the module's {@code src/main/java}
     * @param allowedRoots    {@code com.kopruq.<root>} package roots the module may import: its own and those of
     *                        its (transitive) pom dependencies
     * @param isApi           true only for the Spring Boot {@code api} module (it may use the frameworks and may
     *                        import any module it declares)
     */
    static List<String> violations(String module, Map<String, String> sources, Set<String> allowedRoots, boolean isApi) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            for (String imported : imports(file.getValue())) {
                if (!isApi) {
                    for (String prefix : FRAMEWORK_PREFIXES) {
                        if (imported.startsWith(prefix)) {
                            violations.add(module + ": " + file.getKey() + " imports " + imported
                                    + " (only 'api' may depend on a framework)");
                        }
                    }
                }
                if (MIDAS_FREE_MODULES.contains(module) && imported.startsWith("com.kopruq.midas.")) {
                    violations.add(module + ": " + file.getKey() + " imports " + imported
                            + " (MIDAS-specific code lives only in midas-adapter)");
                }
                if (imported.startsWith(KOPRUQ_PREFIX)) {
                    String rest = imported.substring(KOPRUQ_PREFIX.length());
                    int dot = rest.indexOf('.');
                    String root = dot < 0 ? rest : rest.substring(0, dot);
                    if (!allowedRoots.contains(root)) {
                        violations.add(module + ": " + file.getKey() + " imports " + imported
                                + " but its pom does not (transitively) depend on the module that owns 'com.kopruq."
                                + root + "'");
                    }
                }
            }
        }
        return violations;
    }

    /**
     * Direct internal dependencies that no source file (main or test) of the module uses. An unused module edge is
     * dead weight that hides the real dependency graph and silently widens what a module may reach.
     *
     * @param declaredDependencies artifact ids of the module's direct com.kopruq dependencies
     * @param rootsByModule        module artifact id -> the {@code com.kopruq.<root>} package roots it owns
     * @param allSources           the module's main and test sources
     */
    static List<String> unusedDependencies(String module, List<String> declaredDependencies,
            Map<String, Set<String>> rootsByModule, Iterable<String> allSources) {
        Set<String> importedRoots = new java.util.HashSet<>();
        for (String source : allSources) {
            for (String imported : imports(source)) {
                if (imported.startsWith(KOPRUQ_PREFIX)) {
                    String rest = imported.substring(KOPRUQ_PREFIX.length());
                    int dot = rest.indexOf('.');
                    importedRoots.add(dot < 0 ? rest : rest.substring(0, dot));
                }
            }
        }
        List<String> violations = new ArrayList<>();
        for (String dependency : declaredDependencies) {
            Set<String> roots = rootsByModule.getOrDefault(dependency, Set.of());
            if (!roots.isEmpty() && roots.stream().noneMatch(importedRoots::contains)) {
                violations.add(module + ": pom declares a dependency on '" + dependency
                        + "' but no source file imports anything from it");
            }
        }
        return violations;
    }

    /** Violations of one module's pom: a non-api module must not depend on any Spring (or Lombok) artifact. */
    static List<String> pomViolations(String module, List<String> dependencyGroupIds, boolean isApi) {
        List<String> violations = new ArrayList<>();
        if (!isApi) {
            for (String groupId : dependencyGroupIds) {
                if (groupId.startsWith("org.springframework") || groupId.startsWith("org.projectlombok")) {
                    violations.add(module + ": pom depends on groupId " + groupId + " (only 'api' may depend on a framework)");
                }
            }
        }
        return violations;
    }
}
