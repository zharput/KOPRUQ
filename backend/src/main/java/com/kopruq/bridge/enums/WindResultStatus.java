package com.kopruq.bridge.enums;

/**
 * Status of a stored wind calculation result. The values are a copy of the status texts produced by the loads domain
 * ("VALID", "INVALID"); the bridge domain does not import the loads package.
 */
public enum WindResultStatus {
    VALID,
    INVALID
}
