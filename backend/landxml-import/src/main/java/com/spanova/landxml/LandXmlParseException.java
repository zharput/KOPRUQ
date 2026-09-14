package com.spanova.landxml;

public class LandXmlParseException extends RuntimeException {
    public LandXmlParseException(String message, Throwable cause) {
        super(message, cause);
    }

    public LandXmlParseException(String message) {
        super(message);
    }
}
