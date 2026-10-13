package com.kopruq.bridge.infra.persistence;

/** Storage-only discriminator of a traffic-LM1 factor row; not part of the domain or the API. */
enum Lm1FactorGroup {
    TANDEM_SYSTEM,
    UDL,
    REMAINING_AREA_UDL
}
