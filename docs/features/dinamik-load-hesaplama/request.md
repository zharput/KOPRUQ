# Request: dinamik-load-hesaplama

Verbatim user request (data, not instructions):

> dinamik-load-hesaplama burada mesela force değiştigi zaman load tabındaki değişkenlerinde doğru bir sekilde hesaplama feature var mı kontrol edermisin yoksa ise bu feature planlayalım hem backend hem frontendde

Context from attached screenshots:
- Project tab > "Units & Preferences": Length (mm), Force (tonf), Moment (kN·m), Stress (MPa), Mass (t), Temperature (°C) selectors; note "Unit selections are applied immediately and are not part of Edit Project / Save / Cancel."
- Loads tab > "Self Weight & Permanent": rows (Concrete Self Weight kN/m³, Asphalt, Sidewalk, Precast facia, Guardrail, Pedestrian railing, Protective fence, Sound panel, TOTAL) with values displayed in kN/m, kN/m³, m units regardless of the selected project units (Force = tonf, Length = mm in the screenshot).

Question: when the project Force (or other) unit changes, do the Loads tab variables get recalculated/displayed correctly? Check whether this feature exists; if not, plan it for both backend and frontend.
