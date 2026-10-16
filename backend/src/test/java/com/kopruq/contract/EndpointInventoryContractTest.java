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
 * endpoints. The 21 original ones, the 4 project endpoints approved for backend-db-persistence M1 and the 9 design-system
 * endpoints approved for M2, and the 7 load-input and graph
 * endpoints approved for M3 (41 in total) and the project delete endpoint of e2e-test-data-cleanup (42 in total).
 */
class EndpointInventoryContractTest extends ContractTestSupport {

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    @Test
    void applicationEndpointSet_isExactlyTheApprovedOne() {
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
                "POST /api/temperature/uniform/resolve",
                // backend-db-persistence M1
                "GET /api/projects",
                "POST /api/projects",
                "GET /api/projects/{projectId}",
                "PUT /api/projects/{projectId}/workspace",
                "DELETE /api/projects/{projectId}",
                // backend-db-persistence M2
                "PUT /api/projects/{projectId}/bridge-definitions",
                "PUT /api/projects/{projectId}/families/piers",
                "PUT /api/projects/{projectId}/families/pier-caps",
                "PUT /api/projects/{projectId}/families/foundations",
                "PUT /api/projects/{projectId}/families/bearings",
                "PUT /api/projects/{projectId}/families/materials",
                "PUT /api/projects/{projectId}/girder-library",
                "PUT /api/projects/{projectId}/preferred-span-rules",
                "PUT /api/projects/{projectId}/cross-section",
                // backend-db-persistence M3
                "PUT /api/projects/{projectId}/loads/seismic",
                "PUT /api/projects/{projectId}/loads/wind",
                "PUT /api/projects/{projectId}/loads/temperature",
                "PUT /api/projects/{projectId}/loads/self-weight",
                "PUT /api/projects/{projectId}/loads/traffic-lm1",
                "PUT /api/projects/{projectId}/loads/wind-snapshot",
                "PUT /api/projects/{projectId}/graphs/{graphId}"));

        assertEquals(expected, actual);
    }
}
