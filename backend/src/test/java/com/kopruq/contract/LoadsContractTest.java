package com.kopruq.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 0b: happy-path snapshots of the load endpoints.
 * The values are CHARACTERIZATION of current behavior, not engineering
 * validation.
 */
class LoadsContractTest extends ContractTestSupport {

    @Test
    void seismicType1GroundA_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/seismic/spectrum",
                "{\"agR\":0.2,\"importanceFactor\":1.0,\"groundType\":\"A\",\"spectrumType\":\"Type 1\"}");
        assertEquals("VALID", n.get("status").asText());
        assertEquals(0.2, n.get("ag").asDouble(), 1e-12);
        assertEquals(1.0, n.get("s").asDouble(), 1e-12);
        assertEquals(0.15, n.get("tb").asDouble(), 1e-12);
        assertEquals(0.4, n.get("tc").asDouble(), 1e-12);
        assertEquals(2.0, n.get("td").asDouble(), 1e-12);
        assertEquals(0.5, n.get("peakElasticAcceleration").asDouble(), 1e-12);
        assertEquals(401, n.get("points").size());
        assertEquals(0.5, n.get("points").get(20).get("acceleration").asDouble(), 1e-12);
        assertEquals(0.2, n.get("points").get(100).get("acceleration").asDouble(), 1e-12);
        assertEquals(0.025, n.get("points").get(400).get("acceleration").asDouble(), 1e-12);
    }

    @Test
    void seismicType2GroundE_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/seismic/spectrum",
                "{\"agR\":0.2,\"importanceFactor\":1.0,\"groundType\":\"E\",\"spectrumType\":\"Type 2\"}");
        assertEquals("VALID", n.get("status").asText());
        assertEquals(1.6, n.get("s").asDouble(), 1e-12);
        assertEquals(0.05, n.get("tb").asDouble(), 1e-12);
        assertEquals(0.25, n.get("tc").asDouble(), 1e-12);
        assertEquals(1.2, n.get("td").asDouble(), 1e-12);
        assertEquals(0.8, n.get("peakElasticAcceleration").asDouble(), 1e-12);
        assertEquals(0.2, n.get("points").get(100).get("acceleration").asDouble(), 1e-12);
        assertEquals(0.015, n.get("points").get(400).get("acceleration").asDouble(), 1e-12);
    }

    @Test
    void windTerrainII_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/wind-loads/resolve",
                "{\"vbMs\":27,\"terrainCategory\":\"II\",\"zeM\":10,\"deckWidthM\":13.8,\"drefM\":2.5}");
        assertEquals("VALID", n.get("status").asText());
        assertEquals(0.05, n.get("z0M").asDouble(), 1e-12);
        assertEquals(2.0, n.get("zminM").asDouble(), 1e-12);
        assertEquals(0.19, n.get("kr").asDouble(), 1e-12);
        assertEquals(1.0066802996441269, n.get("cr").asDouble(), 1e-12);
        assertEquals(27.180368090391426, n.get("vmMs").asDouble(), 1e-9);
        assertEquals(0.18873916581775485, n.get("turbulenceIntensity").asDouble(), 1e-12);
        assertEquals(1.0717621422844528, n.get("qpKNm2").asDouble(), 1e-12);
        assertEquals(5.52, n.get("bOverD").asDouble(), 1e-12);
        assertEquals(1.3, n.get("cfx").asDouble(), 1e-12);
        assertEquals(3.483226962424472, n.get("transverseKNm").asDouble(), 1e-12);
        assertTrue(n.get("missing").isNull());
    }

    @Test
    void uniformTemperature_snapshot() throws Exception {
        JsonNode n = postJsonOk("/api/temperature/uniform/resolve",
                "{\"effectiveMinimumTemperatureC\":-10,\"effectiveMaximumTemperatureC\":40,\"initialTemperatureC\":10}");
        assertEquals("VALID", n.get("status").asText());
        assertEquals(-20.0, n.get("contractionC").asDouble(), 1e-12);
        assertEquals(30.0, n.get("expansionC").asDouble(), 1e-12);
        assertEquals("EN 1991-1-5", n.get("standard").asText());
        assertEquals("PROJECT_INPUT", n.get("thermalExpansionSource").asText());
        assertEquals(0, n.get("missingParameters").size());
        assertEquals(1.0E-5, n.get("concreteAlphaTPerC").asDouble(), 1e-15);
        assertEquals(1.2E-5, n.get("steelAlphaTPerC").asDouble(), 1e-15);
    }

    @Test
    void lm1Defaults_threeLanes_snapshot() throws Exception {
        JsonNode n = getOk("/api/traffic-loads/lm1-defaults?laneCount=3");
        assertEquals(3, n.get("tandemSystem").size());
        assertEquals(3, n.get("udl").size());
        assertEquals("Q1k", n.get("tandemSystem").get(0).get("label").asText());
        assertEquals(300.0, n.get("tandemSystem").get(0).get("characteristicValue").get("value").asDouble(), 0);
        assertEquals(200.0, n.get("tandemSystem").get(1).get("characteristicValue").get("value").asDouble(), 0);
        assertEquals(100.0, n.get("tandemSystem").get(2).get("characteristicValue").get("value").asDouble(), 0);
        assertEquals(9.0, n.get("udl").get(0).get("characteristicValue").get("value").asDouble(), 0);
        assertEquals(2.5, n.get("udl").get(1).get("characteristicValue").get("value").asDouble(), 0);
        assertEquals("qrk", n.get("remainingAreaUdl").get("label").asText());
        assertEquals("CODE_DEFAULT", n.get("remainingAreaUdl").get("characteristicValue").get("provenance").asText());
    }

    @Test
    void loadGroups_listsSixPlaceholderGroups() throws Exception {
        JsonNode n = getOk("/api/traffic-loads/load-groups");
        assertEquals(6, n.size());
        assertEquals("NOT_DEFINED", n.get(0).get("status").asText());
    }

    @Test
    void trafficResolve_13_80_1_00_1_50_givesThreeLanesAnd2_30Remainder() throws Exception {
        JsonNode lm1 = getOk("/api/traffic-loads/lm1-defaults?laneCount=3");
        JsonNode n = postJsonOk("/api/traffic-loads/resolve",
                "{\"carriageway\":{\"deckWidthM\":13.8,\"leftWalkwayM\":1.0,\"rightWalkwayM\":1.5},\"lm1\":" + lm1 + "}");
        assertEquals(3, n.get("notionalLanes").get("lanes").size());
        assertEquals(3.0, n.get("notionalLanes").get("lanes").get(0).get("widthM").asDouble(), 0);
        assertEquals(2.30, n.get("notionalLanes").get("remainingAreaWidthM").asDouble(), 1e-9);
        assertTrue(n.get("validation").get("carriagewayDefined").asBoolean());
        assertTrue(n.get("validation").get("notionalLanesGenerated").asBoolean());
        assertTrue(n.get("validation").get("lm1Resolved").asBoolean());
        assertEquals(0, n.get("validation").get("warnings").size());
    }

    // ---- Faz 5: LM1 / carriageway validation through the REST layer.

    private static final String CARRIAGEWAY = "{\"deckWidthM\":13.8,\"leftWalkwayM\":1.0,\"rightWalkwayM\":1.5}";
    private static final String ROW = "{\"label\":\"x\",\"characteristicValue\":{\"value\":10.0,\"provenance\":\"CODE_DEFAULT\",\"codeDefaultValue\":10.0},"
            + "\"adjustmentFactor\":{\"value\":1.0,\"provenance\":\"CODE_DEFAULT\",\"codeDefaultValue\":1.0}}";

    private JsonNode resolveTraffic(String carriageway, String lm1) throws Exception {
        return postJsonOk("/api/traffic-loads/resolve", "{\"carriageway\":" + carriageway + ",\"lm1\":" + lm1 + "}");
    }

    @Test
    void trafficResolve_emptyOrNullLm1Parts_areUnresolvedWithAWarning_not500() throws Exception {
        String[] lm1s = {
                "{\"tandemSystem\":[],\"udl\":[],\"remainingAreaUdl\":" + ROW + "}",
                "{\"tandemSystem\":[" + ROW + "],\"udl\":[" + ROW + "],\"remainingAreaUdl\":null}",
                "{\"tandemSystem\":[null],\"udl\":[" + ROW + "],\"remainingAreaUdl\":" + ROW + "}",
                "{\"tandemSystem\":[{\"label\":\"x\",\"characteristicValue\":null,\"adjustmentFactor\":null}],"
                        + "\"udl\":[" + ROW + "],\"remainingAreaUdl\":" + ROW + "}",
                "{\"tandemSystem\":null,\"udl\":null,\"remainingAreaUdl\":null}"};
        for (String lm1 : lm1s) {
            JsonNode v = resolveTraffic(CARRIAGEWAY, lm1).get("validation");
            assertFalse(v.get("lm1Resolved").asBoolean(), lm1);
            assertTrue(v.get("warnings").get(0).asText().contains("LM1"), lm1);
        }
    }

    @Test
    void trafficResolve_nullOrNonFiniteCarriageway_is400() throws Exception {
        var nullCarriageway = postJson("/api/traffic-loads/resolve", "{\"carriageway\":null,\"lm1\":null}");
        assertEquals(400, nullCarriageway.getResponse().getStatus());
        assertEquals("carriageway is required", body(nullCarriageway).get("message").asText());

        var nonFinite = postJson("/api/traffic-loads/resolve",
                "{\"carriageway\":{\"deckWidthM\":\"NaN\",\"leftWalkwayM\":0,\"rightWalkwayM\":0},\"lm1\":null}");
        assertEquals(400, nonFinite.getResponse().getStatus());
    }

    @Test
    void trafficResolve_zeroLaneCarriageway_warnsAboutNarrowCarriageway() throws Exception {
        JsonNode v = resolveTraffic("{\"deckWidthM\":0,\"leftWalkwayM\":0,\"rightWalkwayM\":0}", "null").get("validation");
        assertFalse(v.get("notionalLanesGenerated").asBoolean());
        assertTrue(v.get("warnings").get(0).asText().contains("narrower than 6 m"));
    }

    @Test
    void concreteMaterial_c30_37_snapshot() throws Exception {
        JsonNode n = getOk("/api/materials/concrete?materialId=C30/37");
        assertEquals("ConcreteMaterial", n.get("domainType").asText());
        JsonNode props = n.get("properties");
        assertEquals(30.0, props.get("fck").get("value").asDouble(), 1e-12);
        assertEquals(38.0, props.get("fcm").get("value").asDouble(), 1e-12);
        assertEquals(32836.56803133079, props.get("Ecm").get("value").asDouble(), 1e-6);
        assertEquals(25.0, props.get("unitWeight").get("value").asDouble(), 1e-12);
        assertEquals(0.2, props.get("poissonRatioUncracked").get("value").asDouble(), 1e-12);
    }

    // ---- Faz 1 (was current_* in CurrentDefectsContractTest): invalid input is a 200 + INVALID, never a silent VALID or a 500.

    private void assertInvalidSeismic(String body) throws Exception {
        JsonNode n = postJsonOk("/api/seismic/spectrum", body);
        assertEquals("INVALID", n.get("status").asText(), body);
        assertEquals(0, n.get("points").size(), body);
    }

    @Test
    void seismic_invalidSpectrumAndGroundTypes_areInvalid() throws Exception {
        for (String type : new String[] {"null", "\"type 2\"", "\"Type 3\""}) {
            assertInvalidSeismic("{\"agR\":0.2,\"importanceFactor\":1.0,\"groundType\":\"A\",\"spectrumType\":" + type + "}");
        }
        for (String ground : new String[] {"\"\"", "\"AB\"", "\"a\"", "null"}) {
            assertInvalidSeismic("{\"agR\":0.2,\"importanceFactor\":1.0,\"groundType\":" + ground + ",\"spectrumType\":\"Type 1\"}");
        }
        assertInvalidSeismic("{\"agR\":\"NaN\",\"importanceFactor\":1.0,\"groundType\":\"A\",\"spectrumType\":\"Type 1\"}");
        assertInvalidSeismic("{\"agR\":0.2,\"importanceFactor\":\"Infinity\",\"groundType\":\"A\",\"spectrumType\":\"Type 1\"}");
    }

    @Test
    void seismic_allValidCombinations_stayValid() throws Exception {
        for (String type : new String[] {"Type 1", "Type 2"}) {
            for (String ground : new String[] {"A", "B", "C", "D", "E"}) {
                JsonNode n = postJsonOk("/api/seismic/spectrum",
                        "{\"agR\":0.2,\"importanceFactor\":1.0,\"groundType\":\"" + ground + "\",\"spectrumType\":\"" + type + "\"}");
                assertEquals("VALID", n.get("status").asText(), type + ground);
                assertEquals(401, n.get("points").size());
            }
        }
    }

    private void assertInvalidWind(String vb, String cat, String ze, String width, String dref) throws Exception {
        JsonNode n = postJsonOk("/api/wind-loads/resolve", "{\"vbMs\":" + vb + ",\"terrainCategory\":" + cat
                + ",\"zeM\":" + ze + ",\"deckWidthM\":" + width + ",\"drefM\":" + dref + "}");
        assertEquals("INVALID", n.get("status").asText());
        assertTrue(n.get("transverseKNm").isNull());
    }

    @Test
    void wind_invalidInputs_are200Invalid() throws Exception {
        assertInvalidWind("27", "null", "10", "13.8", "2.5");
        assertInvalidWind("27", "\"V\"", "10", "13.8", "2.5");
        assertInvalidWind("\"NaN\"", "\"II\"", "10", "13.8", "2.5");
        assertInvalidWind("27", "\"II\"", "\"Infinity\"", "13.8", "2.5");
        assertInvalidWind("27", "\"II\"", "-1", "13.8", "2.5");
        assertInvalidWind("27", "\"II\"", "10", "0", "2.5");
        assertInvalidWind("27", "\"II\"", "10", "-2", "2.5");
        assertInvalidWind("27", "\"II\"", "10", "13.8", "\"NaN\"");
    }

    @Test
    void temperature_nonFiniteInput_isInvalidWithMessage() throws Exception {
        JsonNode n = postJsonOk("/api/temperature/uniform/resolve",
                "{\"effectiveMinimumTemperatureC\":\"NaN\",\"effectiveMaximumTemperatureC\":40,\"initialTemperatureC\":10}");
        assertEquals("INVALID", n.get("status").asText());
        assertTrue(n.get("missingParameters").get(0).asText().contains("Te,min"));
        assertTrue(n.get("effectiveMinimumC").isNull());
    }
}
