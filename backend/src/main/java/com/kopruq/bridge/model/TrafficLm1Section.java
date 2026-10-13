package com.kopruq.bridge.model;

/** The traffic-LM1 section; null {@code inputs} means "cleared / not set". */
public record TrafficLm1Section(TrafficLm1Inputs inputs) implements ProjectSection {
}
