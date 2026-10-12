package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The import endpoints now leave their data in the database (feature "backend"); the responses are unchanged. */
class PersistenceContractTest extends ContractTestSupport {

    @Autowired
    JdbcTemplate jdbc;

    private int count(String table, String column, String id) {
        return jdbc.queryForObject("select count(*) from " + table + " where " + column + " = ?", Integer.class, id);
    }

    @Test
    void landxmlImport_isStoredInTheDatabase_andReadBackThroughTheEndpoints() throws Exception {
        MvcResult r = importSample("Main Alignment");
        assertEquals(200, r.getResponse().getStatus());
        JsonNode n = body(r);
        String id = n.get("id").asText();
        String terrainId = n.get("terrainId").asText();

        assertEquals(1, count("landxml_import", "id", id));
        assertEquals(1, count("terrain", "id", terrainId));
        assertEquals(1, count("terrain_source", "terrain_id", terrainId));
        assertTrue(count("landxml_alignment_element", "import_id", id) >= 2, "straight + curve rows");
        assertTrue(count("landxml_profile_pvi", "import_id", id) >= 2);
        assertEquals(1, count("landxml_import_warning", "import_id", id));

        // the endpoints read what the database holds
        assertEquals(5, getOk("/api/landxml/" + id + "/profile?stepM=50").size());
        assertEquals(21, getOk("/api/alignment/" + id + "/sample?stepM=0").size());
        assertEquals(12, getOk("/api/terrain/" + terrainId + "/mesh").get("positions").size());
        assertEquals(6.0, getOk("/api/terrain/" + terrainId + "/elevation?x=5&y=5").get("elevationM").asDouble(), 1e-9);
    }

    @Test
    void landxmlImportWithoutAlignment_storesNoAlignmentOrProfileRows() throws Exception {
        JsonNode n = body(importSample(null));
        String id = n.get("id").asText();

        assertEquals(1, count("landxml_import", "id", id));
        assertEquals(0, count("landxml_alignment_element", "import_id", id));
        assertEquals(0, count("landxml_profile_pvi", "import_id", id));
    }

    @Test
    void xyzImport_isStoredInTheDatabase() throws Exception {
        MvcResult r = uploadXyz("0 0 1\n10 0 2\n0 10 3\n10 10 4\n");
        assertEquals(200, r.getResponse().getStatus());
        String terrainId = body(r).get("id").asText();

        assertEquals(1, count("terrain", "id", terrainId));
        assertEquals(0, count("terrain_source", "terrain_id", terrainId));
        assertEquals(4, getOk("/api/terrain/" + terrainId + "/mesh").get("positions").size() / 3);
    }
}
