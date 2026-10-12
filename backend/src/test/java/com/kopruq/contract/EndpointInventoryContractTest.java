package com.kopruq.contract;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * BACKEND-REMEDIATION Faz 0b: pins the exact set of application REST
 * endpoints. This remediation must neither add nor remove an endpoint.
 */
class EndpointInventoryContractTest extends ContractTestSupport {

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    @Test
    void applicationEndpointSet_isExactlyTheExistingOne() {
        Set<String> actual = new TreeSet<>();
        for (var entry : handlerMapping.getHandlerMethods().entrySet()) {
            if (!entry.getValue().getBeanType().getName().startsWith("com.kopruq.")) {
                continue;
            }
            RequestMappingInfo info = entry.getKey();
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            for (String pattern : info.getPathPatternsCondition().getPatternValues()) {
                for (RequestMethod method : methods) {
                    actual.add(method + " " + pattern);
                }
            }
        }

        Set<String> expected = new TreeSet<>(Set.of(
                "POST /api/alignment/sample",
                "GET /api/alignment/{id}/sample",
                "POST /api/alternatives",
                "POST /api/fast-solver/solve",
                "POST /api/kernel-state",
                "POST /api/landxml/inspect",
                "POST /api/landxml/import",
                "GET /api/landxml/{id}/profile",
                "POST /api/layout/generate",
                "GET /api/materials/concrete",
                "POST /api/terrain/import",
                "GET /api/terrain/{id}/mesh",
                "GET /api/terrain/{id}/mesh.bin",
                "GET /api/terrain/{id}/diagnostics",
                "GET /api/terrain/{id}/elevation",
                "POST /api/seismic/spectrum",
                "GET /api/traffic-loads/lm1-defaults",
                "GET /api/traffic-loads/load-groups",
                "POST /api/traffic-loads/resolve",
                "POST /api/wind-loads/resolve",
                "POST /api/temperature/uniform/resolve"));

        assertEquals(expected, actual);
    }
}
