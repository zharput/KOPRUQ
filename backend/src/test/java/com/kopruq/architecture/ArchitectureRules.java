package com.kopruq.architecture;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The package-boundary rules of the single-module modular monolith (docs/architecture/backend-reference.md R1, R3,
 * R4; CLAUDE.md "Backend architecture") as pure functions over file contents, so the rules themselves can be tested
 * with synthetic input ({@link ArchitectureTests}) without touching the real source tree.
 *
 * <p>Layout: {@code com.kopruq.<domain>/{api,application,domain,model,enums,infra}},
 * {@code com.kopruq.shared/{config,exception,quantity,validation}} and {@code com.kopruq.KopruqApplication}.
 */
final class ArchitectureRules {

    private static final Pattern IMPORT = Pattern.compile("^\\s*import\\s+(?:static\\s+)?([\\w.]+\\*?)", Pattern.MULTILINE);
    private static final Pattern PACKAGE = Pattern.compile("^\\s*package\\s+([\\w.]+)\\s*;", Pattern.MULTILINE);
    private static final Pattern REST_CONTROLLER = Pattern.compile("(?m)^\\s*@RestController\\b(?!Advice)");
    private static final Pattern NEW_COLLABORATOR_FIELD = Pattern.compile(
            "(?m)^\\s*(?:private|protected|public)?\\s*(?:static\\s+)?(?:final\\s+)?[A-Z]\\w*(?:<[^>]*>)?\\s+\\w+\\s*=\\s*new\\s+"
                    + "[A-Z]\\w*(?:Service|Engine|Generator|Factory|Catalog|Builder|Repository|UseCase|Sampler)\\s*\\(");
    /** The annotation used on a class (a line starting with it) - a mention in a comment does not count. */
    private static final Pattern CROSS_ORIGIN_USE = Pattern.compile(
            "(?m)^\\s*@CrossOrigin\\b|import\\s+org\\.springframework\\.web\\.bind\\.annotation\\.CrossOrigin");

    static final String KOPRUQ = "com.kopruq";

    static final Set<String> DOMAINS = Set.of("geometry", "alignment", "terrain", "landxml", "loads", "materials",
            "layout", "bridge", "rules", "generative", "analysis");
    static final Set<String> LAYERS = Set.of("api", "application", "domain", "model", "enums", "infra");
    /** The layers that hold framework-free business logic ("core"). */
    static final Set<String> CORE_LAYERS = Set.of("model", "domain", "enums");
    static final Set<String> SHARED_PACKAGES = Set.of("config", "exception", "quantity", "validation");
    static final Set<String> ROOT_FILES = Set.of("KopruqApplication.java");

    static final List<String> FRAMEWORK_PREFIXES = List.of("org.springframework.", "jakarta.", "org.slf4j.",
            "com.fasterxml.jackson.", "org.hibernate.");

    /** Persistence technology: only {@code <domain>.infra.persistence} may import it. */
    static final List<String> PERSISTENCE_PREFIXES = List.of("jakarta.persistence.", "org.springframework.data.", "org.hibernate.");

    /** Direct domain dependencies of the core layers (model, domain, enums), as of the pinned graph. */
    static final Map<String, Set<String>> CORE_DEPS = Map.ofEntries(
            Map.entry("geometry", Set.of()),
            Map.entry("alignment", Set.of("geometry")),
            Map.entry("terrain", Set.of("geometry")),
            Map.entry("landxml", Set.of("geometry", "alignment", "terrain")),
            Map.entry("loads", Set.of()),
            Map.entry("materials", Set.of()),
            Map.entry("layout", Set.of("alignment")),
            Map.entry("bridge", Set.of()),
            Map.entry("rules", Set.of("bridge")),
            Map.entry("generative", Set.of("bridge", "rules")),
            Map.entry("analysis", Set.of("materials")));

    /** Direct domain dependencies over all layers (api/application/infra included). */
    static final Map<String, Set<String>> DOMAIN_DEPS = Map.ofEntries(
            Map.entry("geometry", Set.of()),
            Map.entry("alignment", Set.of("geometry", "landxml")),
            Map.entry("terrain", Set.of("geometry")),
            Map.entry("landxml", Set.of("geometry", "alignment", "terrain")),
            Map.entry("loads", Set.of()),
            Map.entry("materials", Set.of()),
            Map.entry("layout", Set.of("alignment", "geometry")),
            Map.entry("bridge", Set.of("terrain", "landxml")),
            Map.entry("rules", Set.of("bridge")),
            Map.entry("generative", Set.of("bridge", "rules")),
            Map.entry("analysis", Set.of("materials")));

    /** Domain edges of the {@code shared} packages that are not composition roots. */
    static final Map<String, Set<String>> SHARED_DEPS = Map.of("shared.exception", Set.of("landxml"));

    /** Pinned set of the approved dependencies of the single pom: groupId:artifactId:scope. */
    static final Set<String> APPROVED_POM_DEPENDENCIES = Set.of(
            "org.springframework.boot:spring-boot-starter-web:compile",
            "org.springframework.boot:spring-boot-starter-actuator:compile",
            "org.locationtech.jts:jts-core:compile",
            "com.fasterxml.jackson.core:jackson-databind:compile",
            "org.springframework.boot:spring-boot-starter-test:test",
            "org.junit.jupiter:junit-jupiter:test",
            "org.springframework.boot:spring-boot-starter-data-jpa:compile",
            "org.flywaydb:flyway-core:compile",
            "org.flywaydb:flyway-database-postgresql:runtime",
            "org.postgresql:postgresql:runtime",
            "com.h2database:h2:test");

    /** Where a package lives. {@code owner} is the domain, or {@code shared.<x>}, or {@code root}. */
    record Location(String owner, String layer, String sub) {
        boolean isDomain() {
            return DOMAINS.contains(owner);
        }

        boolean isCore() {
            return isDomain() && CORE_LAYERS.contains(layer);
        }

        boolean isShared() {
            return owner.startsWith("shared.");
        }
    }

    private ArchitectureRules() {
    }

    // ---------------------------------------------------------------- parsing

    /** All imported names of a Java source text. */
    static List<String> imports(String source) {
        List<String> imports = new ArrayList<>();
        Matcher m = IMPORT.matcher(source);
        while (m.find()) {
            imports.add(m.group(1));
        }
        return imports;
    }

    /** The declared package of a Java source text, or null. */
    static String packageOf(String source) {
        Matcher m = PACKAGE.matcher(source);
        return m.find() ? m.group(1) : null;
    }

    /** The package part of an imported name: the segments before the first upper-case segment or {@code *}. */
    static String packageOfImport(String imported) {
        String[] parts = imported.split("\\.");
        StringBuilder pkg = new StringBuilder();
        for (String part : parts) {
            if (part.equals("*") || Character.isUpperCase(part.charAt(0))) {
                break;
            }
            if (pkg.length() > 0) {
                pkg.append('.');
            }
            pkg.append(part);
        }
        return pkg.toString();
    }

    /**
     * Classifies a {@code com.kopruq...} package into its location, or null if it is not an allowed place.
     *
     * @param packageInfo true if the file in question is a {@code package-info.java} (the only file a domain-root
     *                    package may contain)
     */
    static Location classify(String pkg, boolean packageInfo) {
        if (pkg == null || !(pkg.equals(KOPRUQ) || pkg.startsWith(KOPRUQ + "."))) {
            return null;
        }
        if (pkg.equals(KOPRUQ)) {
            return new Location("root", "", "");
        }
        String[] segs = pkg.substring(KOPRUQ.length() + 1).split("\\.");
        String first = segs[0];
        if (first.equals("shared")) {
            return segs.length == 2 && SHARED_PACKAGES.contains(segs[1]) ? new Location("shared." + segs[1], "", "") : null;
        }
        if (DOMAINS.contains(first)) {
            if (segs.length == 1) {
                return new Location(first, "", "");
            }
            if (LAYERS.contains(segs[1]) && segs.length == 2) {
                return new Location(first, segs[1], "");
            }
            if (segs[1].equals("infra") && segs.length == 3) {
                return new Location(first, "infra", segs[2]);
            }
        }
        return null;
    }

    // ------------------------------------------------------------ T1 locations

    /** R1: every main file is in an allowed package; domain roots hold only package-info, the root only the application class. */
    static List<String> locationViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            String name = simpleName(file.getKey());
            String pkg = packageOf(file.getValue());
            Location loc = classify(pkg, name.equals("package-info.java"));
            if (loc == null) {
                violations.add(file.getKey() + ": package '" + pkg + "' is not an allowed location (com.kopruq.<domain>/"
                        + "{api,application,domain,model,enums,infra[.sub]}, com.kopruq.shared.{config,exception,quantity,validation}, com.kopruq)");
            } else if (loc.owner().equals("root") && !ROOT_FILES.contains(name)) {
                violations.add(file.getKey() + ": only KopruqApplication may live in com.kopruq");
            } else if (loc.isDomain() && loc.layer().isEmpty() && !name.equals("package-info.java")) {
                violations.add(file.getKey() + ": a domain root package may only hold package-info.java");
            }
        }
        return violations;
    }

    // ------------------------------------------------ T2/T3 core layer isolation

    /** R3: core layers know no Spring/jakarta/lombok and import no application/api/infra/config package. */
    static List<String> coreIsolationViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            if (from == null || !from.isCore()) {
                continue;
            }
            for (String imported : imports(file.getValue())) {
                if (imported.startsWith("org.springframework.") || imported.startsWith("lombok.")
                        || imported.startsWith("jakarta.") || imported.startsWith("org.hibernate.")) {
                    violations.add(file.getKey() + ": core layer imports framework type " + imported);
                    continue;
                }
                Location to = importLocation(imported);
                if (to != null && (to.owner().equals("shared.config")
                        || to.isDomain() && Set.of("application", "api", "infra").contains(to.layer()))) {
                    violations.add(file.getKey() + ": core layer imports " + imported
                            + " (model/domain/enums must not depend on application, api or infra)");
                }
            }
        }
        return violations;
    }

    /** R4: core layers import only an explicit allow-list. */
    static List<String> coreAllowListViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            if (from == null || !from.isCore()) {
                continue;
            }
            for (String imported : imports(file.getValue())) {
                if (imported.startsWith("java.")) {
                    continue;
                }
                boolean ok;
                if (imported.equals(KOPRUQ) || imported.startsWith(KOPRUQ + ".")) {
                    Location to = importLocation(imported);
                    ok = to != null && (to.isCore() && (to.owner().equals(from.owner())
                            || CORE_DEPS.getOrDefault(from.owner(), Set.of()).contains(to.owner()))
                            || to.owner().equals("shared.quantity") || to.owner().equals("shared.validation")
                            || to.owner().equals("shared.exception"));
                } else {
                    ok = coreExternalPrefixes(from).stream().anyMatch(imported::startsWith);
                }
                if (!ok) {
                    violations.add(file.getKey() + ": core layer " + describe(from) + " imports " + imported
                            + " which is not on its allow-list");
                }
            }
        }
        return violations;
    }

    private static List<String> coreExternalPrefixes(Location core) {
        if (core.owner().equals("terrain") && core.layer().equals("domain")) {
            return List.of("org.locationtech.jts.");
        }
        if (core.owner().equals("landxml") && core.layer().equals("domain")) {
            return List.of("javax.xml.", "org.w3c.dom.", "org.xml.sax.");
        }
        return List.of();
    }

    // ------------------------------------------------------------ T4 domain graph

    /** Resolved direct domain edges per owner ({@code domain} or {@code shared.exception}), from the imports. */
    static Map<String, Set<String>> domainEdges(Map<String, String> sources, boolean coreOnly) {
        Map<String, Set<String>> edges = new TreeMap<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            if (from == null || from.owner().equals("shared.config") || from.owner().equals("root")) {
                continue;
            }
            if (coreOnly && !from.isCore()) {
                continue;
            }
            Set<String> set = edges.computeIfAbsent(from.owner(), k -> new TreeSet<>());
            for (String imported : imports(file.getValue())) {
                Location to = importLocation(imported);
                if (to != null && to.isDomain() && !to.owner().equals(from.owner())) {
                    set.add(to.owner());
                }
            }
        }
        return edges;
    }

    /**
     * The actual edges must be a subset of the pinned ones, and the union of what is actually used must EQUAL the
     * pinned graph (an unused pinned edge hides the real dependency graph and silently widens what a domain may reach).
     */
    static List<String> edgeViolations(Map<String, Set<String>> actual, Map<String, Set<String>> pinned, String what) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, Set<String>> owner : actual.entrySet()) {
            Set<String> expected = pinned.get(owner.getKey());
            if (expected == null) {
                if (!owner.getValue().isEmpty()) {
                    violations.add(what + ": " + owner.getKey() + " is not in the pinned graph but depends on " + owner.getValue());
                }
                continue;
            }
            for (String dependency : owner.getValue()) {
                if (!expected.contains(dependency)) {
                    violations.add(what + ": " + owner.getKey() + " depends on '" + dependency + "' which is not in the pinned graph");
                }
            }
        }
        for (Map.Entry<String, Set<String>> owner : pinned.entrySet()) {
            Set<String> used = actual.getOrDefault(owner.getKey(), Set.of());
            for (String dependency : owner.getValue()) {
                if (!used.contains(dependency)) {
                    violations.add(what + ": pinned edge " + owner.getKey() + " -> " + dependency + " is not used by any source file");
                }
            }
        }
        return violations;
    }

    // --------------------------------------------------------- T5 external imports

    static List<String> externalImportViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            if (from == null) {
                continue;
            }
            boolean solverAdapter = from.isDomain() && from.owner().equals("analysis") && from.layer().equals("infra")
                    && from.sub().equals("nativeengine");
            for (String imported : imports(file.getValue())) {
                if (imported.startsWith("java.")) {
                    continue;
                }
                if (imported.equals(KOPRUQ) || imported.startsWith(KOPRUQ + ".")) {
                    Location to = importLocation(imported);
                    if (solverAdapter && !(to != null && (to.owner().equals("analysis")
                            && (Set.of("model", "enums", "application").contains(to.layer())
                            || to.layer().equals("infra") && to.sub().equals(from.sub()))))) {
                        violations.add(file.getKey() + ": " + describe(from) + " may only import java.*, the analysis "
                                + "model/enums/application packages and its own package, not " + imported);
                    }
                    continue;
                }
                if (!externalAllowed(from, imported)) {
                    violations.add(file.getKey() + ": " + describe(from) + " may not import " + imported);
                }
            }
        }
        return violations;
    }

    private static boolean externalAllowed(Location from, String imported) {
        if (from.isCore()) {
            return coreExternalPrefixes(from).stream().anyMatch(imported::startsWith);
        }
        if (from.isDomain() && from.owner().equals("analysis") && from.layer().equals("infra")) {
            if (from.sub().equals("nativeengine")) {
                return false;
            }
        }
        boolean frameworkAllowed = from.owner().equals("root")
                || from.owner().equals("shared.config") || from.owner().equals("shared.exception")
                || from.isDomain() && Set.of("api", "application", "infra").contains(from.layer());
        return frameworkAllowed && FRAMEWORK_PREFIXES.stream().anyMatch(imported::startsWith);
    }

    // ------------------------------------------------------ persistence imports

    /**
     * JPA / Spring Data / Hibernate types are imported only by {@code com.kopruq.<domain>.infra.persistence}; no other
     * layer (core, api, application, other infra, shared) may use them. Core layers are additionally covered by
     * {@link #coreIsolationViolations}.
     */
    static List<String> persistenceImportViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            boolean persistencePackage = from != null && from.isDomain() && from.layer().equals("infra")
                    && from.sub().equals("persistence");
            if (persistencePackage) {
                continue;
            }
            for (String imported : imports(file.getValue())) {
                if (PERSISTENCE_PREFIXES.stream().anyMatch(imported::startsWith)) {
                    violations.add(file.getKey() + ": imports persistence type " + imported
                            + " (only com.kopruq.<domain>.infra.persistence may use JPA, Spring Data or Hibernate)");
                }
            }
        }
        return violations;
    }

    // ------------------------------------------------------------- T6 solver code

    static List<String> solverViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            if (from == null) {
                continue;
            }
            boolean inAnalysisInfra = from.owner().equals("analysis") && from.layer().equals("infra");
            boolean composition = from.owner().equals("shared.config");
            for (String imported : imports(file.getValue())) {
                String lower = imported.toLowerCase(Locale.ROOT);
                if ((lower.contains("midas") || lower.contains("scia") || lower.contains("allplan"))
                        && !inAnalysisInfra && !composition) {
                    violations.add(file.getKey() + ": imports solver-specific type " + imported
                            + " (solver adapters live only in com.kopruq.analysis.infra)");
                }
            }
        }
        return violations;
    }

    // ----------------------------------------------------- T7/T8 controllers, T9

    static boolean isRestController(String source) {
        return REST_CONTROLLER.matcher(source).find();
    }

    static List<String> restControllers(Map<String, String> sources) {
        List<String> controllers = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            if (isRestController(file.getValue())) {
                controllers.add(file.getKey());
            }
        }
        return controllers;
    }

    /** {@code @RestController} classes live only in a domain's {@code api} package. */
    static List<String> controllerLocationViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            if (!isRestController(file.getValue())) {
                continue;
            }
            Location loc = locationOf(file);
            if (loc == null || !loc.isDomain() || !loc.layer().equals("api")) {
                violations.add(file.getKey() + ": @RestController outside a <domain>.api package");
            }
        }
        return violations;
    }

    static boolean usesCrossOrigin(String source) {
        return CROSS_ORIGIN_USE.matcher(source).find();
    }

    static boolean buildsCollaboratorWithNew(String source) {
        return NEW_COLLABORATOR_FIELD.matcher(source).find();
    }

    /** Controllers get collaborators by constructor injection; CORS is configured in one place. */
    static List<String> controllerStyleViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            if (usesCrossOrigin(file.getValue())) {
                violations.add(file.getKey() + ": uses @CrossOrigin (CORS lives in WebCorsConfiguration)");
            }
            if (isRestController(file.getValue()) && buildsCollaboratorWithNew(file.getValue())) {
                violations.add(file.getKey() + ": controller builds a collaborator with new (use constructor injection)");
            }
        }
        return violations;
    }

    /** Application services do not import an {@code api} package. */
    static List<String> applicationDependsOnApiViolations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            Location from = locationOf(file);
            if (from == null || !from.isDomain() || !from.layer().equals("application")) {
                continue;
            }
            for (String imported : imports(file.getValue())) {
                Location to = importLocation(imported);
                if (to != null && to.isDomain() && to.layer().equals("api")) {
                    violations.add(file.getKey() + ": application imports " + imported + " from an api package");
                }
            }
        }
        return violations;
    }

    // ------------------------------------------------------------------- T10 pom

    /** The pom must be one jar module without {@code <modules>} and with exactly the approved dependencies. */
    static List<String> pomViolations(String pom) {
        List<String> violations = new ArrayList<>();
        if (pom.contains("<modules>") || pom.contains("<module>")) {
            violations.add("pom declares <modules>; the backend is one Maven module");
        }
        String outsideBuild = pom.replaceAll("(?s)<build>.*?</build>", "");
        String packaging = firstTag(outsideBuild, "packaging");
        if (!"jar".equals(packaging)) {
            violations.add("pom packaging is '" + packaging + "', expected 'jar'");
        }
        String head = pom.replaceAll("(?s)<(parent|dependencyManagement|dependencies|build)>.*?</\\1>", "");
        if (!"kopruq-backend".equals(firstTag(head, "artifactId"))) {
            violations.add("pom artifactId must be kopruq-backend");
        }
        String stripped = outsideBuild.replaceAll("(?s)<dependencyManagement>.*?</dependencyManagement>", "");
        Set<String> actual = new LinkedHashSet<>();
        Matcher block = Pattern.compile("(?s)<dependencies>(.*?)</dependencies>").matcher(stripped);
        while (block.find()) {
            Matcher dep = Pattern.compile("(?s)<dependency>(.*?)</dependency>").matcher(block.group(1));
            while (dep.find()) {
                String scope = firstTag(dep.group(1), "scope");
                actual.add(firstTag(dep.group(1), "groupId") + ":" + firstTag(dep.group(1), "artifactId") + ":"
                        + (scope == null ? "compile" : scope));
            }
        }
        Set<String> extra = new TreeSet<>(actual);
        extra.removeAll(APPROVED_POM_DEPENDENCIES);
        Set<String> missing = new TreeSet<>(APPROVED_POM_DEPENDENCIES);
        missing.removeAll(actual);
        for (String dependency : extra) {
            violations.add("pom declares unapproved dependency " + dependency);
        }
        for (String dependency : missing) {
            violations.add("pom lacks approved dependency " + dependency);
        }
        return violations;
    }

    private static String firstTag(String xml, String tag) {
        Matcher m = Pattern.compile("<" + tag + ">\\s*([^<]*?)\\s*</" + tag + ">").matcher(xml);
        return m.find() ? m.group(1) : null;
    }

    // -------------------------------------------------------------------- helpers

    private static Location locationOf(Map.Entry<String, String> file) {
        return classify(packageOf(file.getValue()), simpleName(file.getKey()).equals("package-info.java"));
    }

    private static Location importLocation(String imported) {
        if (!(imported.equals(KOPRUQ) || imported.startsWith(KOPRUQ + "."))) {
            return null;
        }
        return classify(packageOfImport(imported), false);
    }

    private static String describe(Location loc) {
        return loc.owner() + (loc.layer().isEmpty() ? "" : "." + loc.layer()) + (loc.sub().isEmpty() ? "" : "." + loc.sub());
    }

    private static String simpleName(String path) {
        int slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        return slash < 0 ? path : path.substring(slash + 1);
    }

    /** Convenience for tests: a path-keyed map preserving insertion order. */
    static Map<String, String> files(String... pathsAndSources) {
        Map<String, String> files = new LinkedHashMap<>();
        for (int i = 0; i < pathsAndSources.length; i += 2) {
            files.put(pathsAndSources[i], pathsAndSources[i + 1]);
        }
        return files;
    }
}
