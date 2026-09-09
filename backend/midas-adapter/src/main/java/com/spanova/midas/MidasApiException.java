package com.spanova.midas;

/** Raised for any MIDAS Open API failure - non-200 HTTP status, a MIDAS-reported error body, or a transport error. */
public class MidasApiException extends RuntimeException {

    public MidasApiException(String message) {
        super(message);
    }

    public MidasApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
