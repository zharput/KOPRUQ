package com.kopruq.alignment.application;

/** One horizontal sample of an alignment: the chainage and the plan position there, all in metres. */
public record AlignmentSample(double chainageM, double xM, double yM) {
}
