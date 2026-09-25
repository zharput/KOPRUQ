package com.kopruq.midas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Thin HTTP wrapper around MIDAS Civil NX's Open API - the only class in
 * this module that touches the network. Confirmed live (2026-09-09)
 * against the engineer's own MIDAS Civil NX: base URL
 * {@code https://moa-engineers.midasit.com:443/civil}, auth header
 * {@code MAPI-Key}, JSON request/response.
 *
 * <p>Requires MIDAS Civil NX to be open and API-connected (Apps &gt; API
 * &gt; API Settings &gt; Connect) on the machine identified by the
 * configured key - there is no headless/server mode (see
 * docs/MIDAS_INTEGRATION_ANALYSIS.md section 1).
 */
public final class MidasApiClient implements MidasHttpClient {

    private final String baseUrl;
    private final String mapiKey;
    private final HttpClient http;
    private final ObjectMapper mapper;

    public MidasApiClient(String baseUrl, String mapiKey) {
        this.baseUrl = baseUrl;
        this.mapiKey = mapiKey;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.mapper = new ObjectMapper();
    }

    /**
     * @param body the JSON body, or {@code null} for an empty {@code {}} body
     *        (matches the DOC endpoints' own "empty body under Argument" convention)
     */
    @Override
    public JsonNode call(String method, String path, JsonNode body) {
        String requestBody = body == null ? "{}" : writeJson(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .timeout(Duration.ofMinutes(2))
                .header("MAPI-Key", mapiKey)
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new MidasApiException("Failed to reach MIDAS API at " + method + " " + path
                    + " - is MIDAS Civil NX open and API-connected?", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MidasApiException("Interrupted while calling MIDAS API " + method + " " + path, e);
        }

        if (response.statusCode() != 200) {
            throw new MidasApiException("MIDAS API returned HTTP " + response.statusCode()
                    + " for " + method + " " + path + ": " + response.body());
        }

        JsonNode responseJson = readJson(response.body());
        if (responseJson.has("error")) {
            throw new MidasApiException("MIDAS API rejected " + method + " " + path
                    + ": " + responseJson.get("error").toString());
        }
        return responseJson;
    }

    private String writeJson(JsonNode node) {
        try {
            return mapper.writeValueAsString(node);
        } catch (IOException e) {
            throw new MidasApiException("Failed to serialize MIDAS API request body", e);
        }
    }

    private JsonNode readJson(String body) {
        try {
            return mapper.readTree(body);
        } catch (IOException e) {
            throw new MidasApiException("MIDAS API returned a response that is not valid JSON: " + body, e);
        }
    }
}
