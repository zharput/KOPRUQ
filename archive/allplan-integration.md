# ALLPLAN Civil Integration

Status: Prototype P01 - draft export only, **not verified against real
ALLPLAN Civil**.

## What exists today

`Spanova.Allplan.AllplanTclExporter` takes a `BridgeAlternative` and a
`BridgeDefinition` and writes a `.tcl` text file containing a flat set of
`spanova(...)` Tcl array variables (bridge name, total length, deck
width, span count, girder count, girder depth, and the list of span
lengths).

## Why this is a draft, not a real integration

Spec section 13 says the first milestone must produce "a valid ALLPLAN
Civil Tcl representation of the selected bridge alternative." Doing that
for real requires knowing ALLPLAN Civil's actual Tcl/API object model for
defining a bridge axis, cross-section, and span layout - e.g. which Tcl
procedures exist, what their exact argument order and units are, and
which product/version they apply to (ALLPLAN Civil's bridge tooling is
a distinct, more specialized product line from the general ALLPLAN
PythonParts API used elsewhere in unrelated parts of this workspace).

No verified reference for that API was available while building P01, and
per the AI policy in spec section 15 ("do not invent engineering
equations" / "do not silently introduce assumptions"), the same
principle was applied to this integration surface: rather than
fabricate plausible-looking Tcl procedure calls, the exporter emits
clearly-labeled, self-documenting variables and says so at the top of
every generated file.

## What is needed to close this gap

1. ALLPLAN Civil's Tcl/API documentation (or a working example script)
   for at minimum: creating/updating a bridge axis, defining span
   boundaries, and setting a girder cross-section by count and depth.
2. Confirmation of ALLPLAN Civil's expected units (this workspace has
   separately confirmed that the *general* Allplan PythonParts API uses
   millimeters internally - ALLPLAN Civil's bridge Tcl API may differ and
   must be checked independently).
3. A decision on how the import is triggered: spec section 13 explicitly
   says the first milestone does **not** require automatic control of
   the ALLPLAN GUI - so a manually-run Tcl script is an acceptable P01
   deliverable, but the script's *content* still needs to be real.

Until then, treat `AllplanTclExporter`'s output as a structured summary
of the selected alternative for a human to translate into ALLPLAN Civil,
not as a script to `source` directly.
