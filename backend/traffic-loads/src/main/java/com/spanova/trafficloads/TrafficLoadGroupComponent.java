package com.spanova.trafficloads;

/** One action inside a {@link TrafficLoadGroup} - structure only, see that type's javadoc. */
public record TrafficLoadGroupComponent(String actionType, String loadModelRef, String condition) {
}
