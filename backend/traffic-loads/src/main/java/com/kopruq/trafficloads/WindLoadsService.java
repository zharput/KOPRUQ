package com.kopruq.trafficloads;

/** EN 1991-1-4 terrain profile and bridge-deck transverse action, base rules only. */
public final class WindLoadsService {
    public WindResult resolve(WindRequest r) {
        if (r == null || r.vbMs() == null || r.vbMs() <= 0 || r.zeM() == null || r.deckWidthM() == null || r.drefM() == null || r.drefM() <= 0)
            return new WindResult("INVALID", 0, 0, 0, 0, 0, 0, 0, 0, 1.3, null, "vb, ze, deck width and dref are required");
        double[] p = switch (r.terrainCategory()) { case "0" -> new double[]{.003,1}; case "I" -> new double[]{.01,1}; case "II" -> new double[]{.05,2}; case "III" -> new double[]{.3,5}; case "IV" -> new double[]{1,10}; default -> null; };
        if (p == null) return new WindResult("INVALID",0,0,0,0,0,0,0,0,1.3,null,"invalid terrain category");
        double kr = .19 * Math.pow(p[0] / .05, .07), z = Math.max(r.zeM(), p[1]);
        double cr = kr * Math.log(z / p[0]), vm = cr * r.vbMs(), iv = 1 / Math.log(z / p[0]);
        double qp = (1 + 7 * iv) * .5 * 1.25 * vm * vm / 1000;
        double cfx = 1.3, load = qp * cfx * r.drefM();
        return new WindResult("VALID",p[0],p[1],kr,cr,vm,iv,qp,r.deckWidthM()/r.drefM(),cfx,load,null);
    }
}
