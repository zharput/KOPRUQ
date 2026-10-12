package com.kopruq.landxml.domain;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import com.kopruq.landxml.enums.CrsStatus;
import com.kopruq.landxml.model.LandXmlAlignment;
import com.kopruq.landxml.model.LandXmlBoundary;
import com.kopruq.landxml.model.LandXmlBreakline;
import com.kopruq.landxml.model.LandXmlCurve;
import com.kopruq.landxml.model.LandXmlDocument;
import com.kopruq.landxml.model.LandXmlFace;
import com.kopruq.landxml.model.LandXmlGeometryElement;
import com.kopruq.landxml.model.LandXmlLine;
import com.kopruq.landxml.model.LandXmlPoint;
import com.kopruq.landxml.model.LandXmlProfile;
import com.kopruq.landxml.model.LandXmlPvi;
import com.kopruq.landxml.model.LandXmlSurface;
import com.kopruq.landxml.model.LandXmlUnits;

/**
 * Streaming (StAX, {@code javax.xml.stream}) LandXML reader - JDK-
 * built-in, no new dependency (LANDXML-P01, docs/roadmap.md). Civil 3D
 * surface exports can have hundreds of thousands of {@code <P>}/
 * {@code <F>} elements; StAX reads forward-only with constant memory,
 * unlike a DOM parser that would hold the whole document as a tree.
 *
 * <p>Only a bounded, known subset of LandXML is read - section
 * detection by local element name (namespace-agnostic, since LandXML's
 * declared namespace URI varies by schema version across tools), not a
 * generic schema-to-object binder. Unsupported content ({@code
 * <Spiral>} transition curves) is skipped with a warning, never
 * silently misread as something else.
 *
 * <p><b>Point ordering</b>: a {@code <P>} element's text content is
 * "Northing Easting Elevation" per the LandXML schema's own documented
 * default point convention - <b>not</b> "X Y Z". This parser follows
 * that documented default (X = Easting = 2nd token, Y = Northing = 1st
 * token). This is a real, known source of import bugs if a given file
 * actually uses a different convention - the import preview is expected
 * to show a handful of raw imported points specifically so this can be
 * visually sanity-checked against known survey coordinates (spec
 * section 22's "never silently guess" extended to data conventions, not
 * just missing values) - confirm against a real exported file before
 * trusting this on production data.
 */
public final class LandXmlParser {

    public LandXmlDocument parse(InputStream input) { return parse(input, null); }

    public LandXmlDocument parse(InputStream input, String selectedSurface) {
        XMLInputFactory factory = XMLInputFactory.newInstance();
        factory.setProperty(XMLInputFactory.IS_NAMESPACE_AWARE, true);
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);

        List<String> warnings = new BoundedWarnings();
        String application = null;
        String formatVersion = null;
        boolean rootSeen = false;
        LandXmlUnits units = null;
        String crsLabel = null;
        List<LandXmlSurface> surfaces = new ArrayList<>();
        List<LandXmlAlignment> alignments = new ArrayList<>();
        List<LandXmlProfile> profiles = new ArrayList<>();

        XMLStreamReader reader;
        try {
            reader = factory.createXMLStreamReader(input);
        } catch (XMLStreamException e) {
            throw new LandXmlParseException("Could not open the LandXML stream: " + e.getMessage(), e);
        }

        try {
            while (reader.hasNext()) {
                int event = reader.next();
                if (event != XMLStreamConstants.START_ELEMENT) {
                    continue;
                }
                if (!rootSeen) {
                    if (!reader.getLocalName().equals("LandXML") || !supportedNamespace(reader.getNamespaceURI())) {
                        throw new LandXmlParseException("Expected a namespaced LandXML 1.0, 1.1 or 1.2 document", null);
                    }
                    rootSeen = true;
                    formatVersion = attr(reader, "version");
                }
                if (!supportedNamespace(reader.getNamespaceURI())) { skipElement(reader); continue; }
                switch (reader.getLocalName()) {
                    case "Application" -> application = attr(reader, "name");
                    case "Units" -> units = readUnits(reader);
                    case "CoordinateSystem" -> crsLabel = readCoordinateSystemLabel(reader);
                    case "Surface" -> {
                        if (selectedSurface == null || selectedSurface.equals(attr(reader, "name"))) {
                            surfaces.add(readSurface(reader, warnings));
                        } else { skipElement(reader); }
                    }
                    case "Alignment" -> readAlignment(reader, warnings, alignments, profiles);
                    default -> { /* not a section this parser reads */ }
                }
            }
        } catch (XMLStreamException e) {
            throw new LandXmlParseException("Could not parse this LandXML file: " + e.getMessage(), e);
        } finally {
            try {
                reader.close();
            } catch (XMLStreamException ignored) {
                // nothing more we can do once parsing has finished
            }
        }

        if (units == null) {
            warnings.add("No <Units> element found - units could not be determined.");
            units = new LandXmlUnits(null);
        }
        CrsStatus crsStatus = crsLabel != null ? CrsStatus.RESOLVED : CrsStatus.REVIEW_REQUIRED;
        if (crsStatus == CrsStatus.REVIEW_REQUIRED) {
            warnings.add("No coordinate system could be determined from this file - confirm it manually before trusting absolute coordinates.");
        }
        if (surfaces.isEmpty()) {
            warnings.add("No <Surface> found in this file.");
        }
        if (alignments.isEmpty()) {
            warnings.add("No <Alignment> found in this file.");
        }

        if (!rootSeen) throw new LandXmlParseException("Empty LandXML document", null);
        return new LandXmlDocument(units, crsStatus, crsLabel, surfaces, alignments, profiles, warnings, application, formatVersion);
    }

    private static LandXmlUnits readUnits(XMLStreamReader reader) throws XMLStreamException {
        String linearUnit = null;
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                String name = reader.getLocalName();
                if (name.equals("Metric") || name.equals("Imperial") || name.equals("USCustomary")) {
                    linearUnit = attr(reader, "linearUnit");
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && reader.getLocalName().equals("Units")) {
                break;
            }
        }
        return new LandXmlUnits(linearUnit);
    }

    private static String readCoordinateSystemLabel(XMLStreamReader reader) {
        String epsg = attr(reader, "epsgCode");
        if (epsg != null && !epsg.isBlank()) {
            return "EPSG:" + epsg;
        }
        String name = attr(reader, "name");
        if (name != null && !name.isBlank()) {
            return name;
        }
        String datum = attr(reader, "horizontalDatumName");
        return (datum != null && !datum.isBlank()) ? datum : null;
    }

    private static boolean supportedNamespace(String uri) {
        return uri != null && (uri.equals("http://www.landxml.org/schema/LandXML-1.0")
                || uri.equals("http://www.landxml.org/schema/LandXML-1.1")
                || uri.equals("http://www.landxml.org/schema/LandXML-1.2"));
    }

    private static void skipElement(XMLStreamReader reader) throws XMLStreamException {
        int depth = 1;
        while (depth > 0 && reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) depth++;
            else if (event == XMLStreamConstants.END_ELEMENT) depth--;
        }
    }

    private static LandXmlSurface readSurface(XMLStreamReader reader, List<String> warnings) throws XMLStreamException {
        String name = attr(reader, "name");
        List<LandXmlPoint> points = new ArrayList<>();
        List<LandXmlFace> faces = new ArrayList<>();
        List<LandXmlBoundary> boundaries = new ArrayList<>();
        List<LandXmlBreakline> breaklines = new ArrayList<>();
        java.util.Deque<String> path = new java.util.ArrayDeque<>();
        path.addLast("Surface");
        int invalidPoints = 0, invalidFaces = 0;
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                if (!supportedNamespace(reader.getNamespaceURI())) { skipElement(reader); continue; }
                String element = reader.getLocalName();
                String context = String.join("/", path);
                if (element.equals("P") && context.equals("Surface/Definition/Pnts")) {
                    String id = attr(reader, "id");
                    LandXmlPoint point = parsePoint(id, reader.getElementText(), warnings);
                    if (point != null && id != null && !id.isBlank()) points.add(point);
                    else invalidPoints++;
                } else if (element.equals("F") && context.equals("Surface/Definition/Faces")) {
                    LandXmlFace face = parseFace(reader.getElementText(), warnings);
                    if (face != null) faces.add(face); else invalidFaces++;
                } else if (element.equals("Boundary") && context.equals("Surface/SourceData/Boundaries")) {
                    String boundaryName = attr(reader, "name");
                    String type = attr(reader, "bndType");
                    boolean edgeTrim = Boolean.parseBoolean(attr(reader, "edgeTrim"));
                    boundaries.add(new LandXmlBoundary(boundaryName,
                            type == null ? "UNKNOWN" : type.toUpperCase(java.util.Locale.ROOT), edgeTrim,
                            readPolyline(reader, "Boundary", warnings)));
                } else if (element.equals("Breakline") && context.equals("Surface/SourceData/Breaklines")) {
                    String breaklineName = attr(reader, "name");
                    breaklines.add(new LandXmlBreakline(breaklineName, readPolyline(reader, "Breakline", warnings)));
                } else { path.addLast(element); }
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                if (reader.getLocalName().equals("Surface")) break;
                path.removeLast();
            }
        }
        return new LandXmlSurface(name, points, faces, boundaries, breaklines, invalidPoints, invalidFaces);
    }

    private static List<LandXmlPoint> readPolyline(XMLStreamReader reader, String end, List<String> warnings)
            throws XMLStreamException {
        List<LandXmlPoint> points = new ArrayList<>();
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                if (!supportedNamespace(reader.getNamespaceURI())) { skipElement(reader); continue; }
                if (reader.getLocalName().equals("PntList3D")) {
                    java.util.StringTokenizer tokens = new java.util.StringTokenizer(reader.getElementText());
                    while (tokens.hasMoreTokens()) {
                        String first = tokens.nextToken();
                        if (!tokens.hasMoreTokens()) { warnings.add("Incomplete " + end + " coordinate tuple"); break; }
                        String second = tokens.nextToken();
                        if (!tokens.hasMoreTokens()) { warnings.add("Incomplete " + end + " coordinate tuple"); break; }
                        LandXmlPoint point = parsePoint(null, first + " " + second + " " + tokens.nextToken(), warnings);
                        if (point != null) points.add(point);
                    }
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && reader.getLocalName().equals(end)) break;
        }
        return points;
    }

    /** Bounded examples prevent damaged million-face files from creating millions of messages. Counts are separate. */
    private static final class BoundedWarnings extends ArrayList<String> {
        @Override public boolean add(String warning) {
            if (size() < 50) return super.add(warning);
            if (size() == 50) return super.add("Further warning examples omitted; see import diagnostic counts.");
            return false;
        }
    }

    private static LandXmlPoint parsePoint(String id, String text, List<String> warnings) {
        String[] tokens = text.trim().split("\\s+");
        if (tokens.length != 3) {
            warnings.add("Skipped a malformed <P id=\"" + id + "\"> (expected 3 numbers): \"" + text + "\"");
            return null;
        }
        try {
            double northing = Double.parseDouble(tokens[0]);
            double easting = Double.parseDouble(tokens[1]);
            double elevation = Double.parseDouble(tokens[2]);
            if (!Double.isFinite(northing) || !Double.isFinite(easting) || !Double.isFinite(elevation)) {
                warnings.add("Non-finite coordinate in point " + id); return null;
            }
            return new LandXmlPoint(id, easting, northing, elevation);
        } catch (NumberFormatException e) {
            warnings.add("Skipped a non-numeric <P id=\"" + id + "\">: \"" + text + "\"");
            return null;
        }
    }

    private static LandXmlFace parseFace(String text, List<String> warnings) {
        String[] tokens = text.trim().split("\\s+");
        if (tokens.length != 3) {
            warnings.add("Skipped a malformed <F> (expected 3 point ids): \"" + text + "\"");
            return null;
        }
        return new LandXmlFace(tokens[0], tokens[1], tokens[2]);
    }

    private static void readAlignment(XMLStreamReader reader, List<String> warnings,
            List<LandXmlAlignment> alignments, List<LandXmlProfile> profiles) throws XMLStreamException {
        String name = attr(reader, "name");
        List<LandXmlGeometryElement> elements = new ArrayList<>();
        List<LandXmlAlignment.SkippedGeometry> skipped = new ArrayList<>();
        List<LandXmlProfile> alignmentProfiles = new ArrayList<>();
        Double staStart = readStaStart(attr(reader, "staStart"));
        int position = 0;

        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                switch (reader.getLocalName()) {
                    case "Line" -> {
                        position++;
                        LandXmlLine line = readLine(reader, name, warnings);
                        // A Line with missing data is NOT replaced by a placeholder at the origin: it is recorded as skipped.
                        if (line != null) elements.add(line);
                        else skipped.add(new LandXmlAlignment.SkippedGeometry("Line", position, elements.size()));
                    }
                    case "Curve" -> {
                        position++;
                        LandXmlCurve curve = readCurve(reader, name, warnings);
                        if (curve != null) elements.add(curve);
                        else skipped.add(new LandXmlAlignment.SkippedGeometry("Curve", position, elements.size()));
                    }
                    case "Spiral" -> {
                        position++;
                        skipped.add(new LandXmlAlignment.SkippedGeometry("Spiral", position, elements.size()));
                        warnings.add(
                                "Alignment \"" + name + "\": a <Spiral> element was skipped - transition curves need "
                                        + "the engineer's own clothoid convention before they're supported.");
                    }
                    case "ProfAlign" -> {
                        // Every <ProfAlign> is its OWN profile: PVIs of different profiles must never be concatenated.
                        String profAlignName = attr(reader, "name");
                        ProfAlignRead read = readProfAlign(reader, name, warnings);
                        if (!read.pvis().isEmpty() || !read.unsupportedReasons().isEmpty()) {
                            alignmentProfiles.add(new LandXmlProfile(profAlignName != null ? profAlignName : name, name,
                                    read.pvis(), read.unsupportedReasons()));
                        }
                    }
                    default -> { }
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && reader.getLocalName().equals("Alignment")) {
                break;
            }
        }

        alignments.add(new LandXmlAlignment(name, elements, skipped, staStart));
        profiles.addAll(alignmentProfiles);
    }

    /** {@code staStart} attribute: absent -> null; unreadable -> NaN (reported as an unconfirmed offset, never as 0). */
    private static Double readStaStart(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    private record ProfAlignRead(List<LandXmlPvi> pvis, List<String> unsupportedReasons) {
    }

    /** @return the line, or {@code null} (with a warning) when Start or End is missing */
    private static LandXmlLine readLine(XMLStreamReader reader, String alignmentName, List<String> warnings) throws XMLStreamException {
        String where = "Alignment \"" + alignmentName + "\" <Line>";
        double[] start = null;
        double[] end = null;
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                if (reader.getLocalName().equals("Start")) {
                    start = parseNe(reader.getElementText(), where + "<Start>");
                } else if (reader.getLocalName().equals("End")) {
                    end = parseNe(reader.getElementText(), where + "<End>");
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && reader.getLocalName().equals("Line")) {
                break;
            }
        }
        if (start == null || end == null) {
            warnings.add("Skipped a <Line> missing Start/End");
            return null;
        }
        return new LandXmlLine(start[0], start[1], end[0], end[1]);
    }

    /** @return the curve, or {@code null} (with a warning) when Start, End, Center or radius is missing */
    private static LandXmlCurve readCurve(XMLStreamReader reader, String alignmentName, List<String> warnings) throws XMLStreamException {
        String where = "Alignment \"" + alignmentName + "\" <Curve>";
        String rot = attr(reader, "rot");
        String radiusAttr = attr(reader, "radius");
        double[] start = null;
        double[] end = null;
        double[] center = null;
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                switch (reader.getLocalName()) {
                    case "Start" -> start = parseNe(reader.getElementText(), where + "<Start>");
                    case "End" -> end = parseNe(reader.getElementText(), where + "<End>");
                    case "Center" -> center = parseNe(reader.getElementText(), where + "<Center>");
                    default -> { }
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && reader.getLocalName().equals("Curve")) {
                break;
            }
        }
        if (start == null || end == null || center == null || radiusAttr == null) {
            warnings.add("Skipped a <Curve> missing Start/End/Center/radius");
            return null;
        }
        double radius = parseFinite(radiusAttr, where + " radius");
        if (radius <= 0) {
            throw new LandXmlParseException(where + " radius must be greater than 0, got \"" + radiusAttr + "\"");
        }
        return new LandXmlCurve(start[0], start[1], end[0], end[1], center[0], center[1],
                radius, "cw".equalsIgnoreCase(rot));
    }

    /** Same Northing-Easting convention as {@link #parsePoint} - returns {x, y} = {Easting, Northing}. */
    private static double[] parseNe(String text, String where) {
        String[] tokens = text.trim().split("\\s+");
        if (tokens.length < 2 || tokens[0].isEmpty()) {
            throw new LandXmlParseException(where + ": expected \"Northing Easting\", got \"" + text.trim() + "\"");
        }
        double northing = parseFinite(tokens[0], where);
        double easting = parseFinite(tokens[1], where);
        return new double[] {easting, northing};
    }

    /** A number that must be a finite double; anything else is a parse error that names where it was found. */
    private static double parseFinite(String token, String where) {
        double value;
        try {
            value = Double.parseDouble(token.trim());
        } catch (NumberFormatException e) {
            throw new LandXmlParseException(where + ": \"" + token + "\" is not a number", e);
        }
        if (!Double.isFinite(value)) {
            throw new LandXmlParseException(where + ": \"" + token + "\" is not a finite number");
        }
        return value;
    }

    private static ProfAlignRead readProfAlign(XMLStreamReader reader, String alignmentName, List<String> warnings) throws XMLStreamException {
        String where = "Alignment \"" + alignmentName + "\" <ProfAlign>";
        List<LandXmlPvi> pvis = new ArrayList<>();
        List<String> unsupported = new ArrayList<>();
        while (reader.hasNext()) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                switch (reader.getLocalName()) {
                    case "ParaCurve", "UnsymParaCurve" -> {
                        unsupported.add("<" + reader.getLocalName() + "> (parabolic curve element)");
                        skipElement(reader);
                    }
                    case "PVI" -> {
                        String text = reader.getElementText();
                        String[] tokens = text.trim().split("\\s+");
                        if (tokens.length < 2) {
                            warnings.add("Skipped a malformed <PVI>: \"" + text + "\"");
                        } else {
                            pvis.add(new LandXmlPvi(parseFinite(tokens[0], where + "<PVI> chainage"),
                                    parseFinite(tokens[1], where + "<PVI> elevation"), 0));
                        }
                    }
                    case "CircCurve" -> {
                        String lengthAttr = attr(reader, "length");
                        // A CircCurve that CARRIES coordinates is a full vertical-curve definition (not the bare
                        // "length applies to the previous PVI" marker of the fixture) - not interpreted, never guessed.
                        String curveText = reader.getElementText();
                        if (!curveText.isBlank()) {
                            unsupported.add("<CircCurve> with coordinates \"" + curveText.trim() + "\"");
                        } else if (lengthAttr != null && !pvis.isEmpty()) {
                            LandXmlPvi last = pvis.remove(pvis.size() - 1);
                            pvis.add(new LandXmlPvi(last.chainageM(), last.elevationM(),
                                    parseFinite(lengthAttr, where + "<CircCurve> length")));
                        }
                    }
                    default -> { }
                }
            } else if (event == XMLStreamConstants.END_ELEMENT && reader.getLocalName().equals("ProfAlign")) {
                break;
            }
        }
        return new ProfAlignRead(pvis, unsupported);
    }

    private static String attr(XMLStreamReader reader, String name) {
        return reader.getAttributeValue(null, name);
    }
}
