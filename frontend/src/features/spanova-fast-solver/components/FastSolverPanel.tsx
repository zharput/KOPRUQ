import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fastSolverSchema, type FastSolverFormValues } from '../model/fastSolverSchema'
import { useFastSolver } from '../hooks/useFastSolver'

/**
 * SPANOVA Fast Solver (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md addendum P):
 * the engineer's own worked test case (2026-09-10) - a 5-span frame
 * bridge, portal-frame piers (2 rectangular columns + cap beam each),
 * elastomeric bearings at every support, fixed column bases - run
 * through the native linear-elastic 3D direct-stiffness solver
 * (backend/analysis-engine). Form defaults to the engineer's own given
 * values; RUN ANALYSIS calls POST /api/fast-solver/solve.
 *
 * <p>Architecture migration Milestone 3 (2026-09-12): form state moved
 * from manual `useState` to React Hook Form + Zod (`../model/
 * fastSolverSchema.ts` - generic required/positive checks only, no
 * invented engineering rule); the backend call moved to `../api/
 * fastSolverService.ts` behind a TanStack Query `useMutation` (`../
 * hooks/useFastSolver.ts`). `spanLengthsM`/`pierHeightsM` are
 * fixed-length arrays (5 spans, 4 piers - this test case's own given
 * geometry never adds/removes a span or pier), so they're registered by
 * index directly rather than via `useFieldArray` (which is for
 * add/remove-able lists, like Site & Layout's no-pier zones).
 */
const initialForm: FastSolverFormValues = {
  spanLengthsM: [30, 40, 50, 40, 25],
  deckWidthM: 15,
  deckThicknessM: 1,
  sdlKnPerM: 10,
  pierHeightsM: [10, 15, 20, 8],
  columnLongitudinalM: 2,
  columnTransverseM: 4,
  columnSpacingTransverseM: 8,
  capBeamWidthM: 3,
  capBeamDepthM: 1.5,
  concreteFckMpa: 30,
  bearingKx: 3000,
  bearingKy: 30000,
  bearingKz: 100000,
  bearingKrx: 100000,
  bearingKry: 100000,
  bearingKrz: 100000,
}

export default function FastSolverPanel() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FastSolverFormValues>({
    resolver: zodResolver(fastSolverSchema),
    defaultValues: initialForm,
  })
  const mutation = useFastSolver()
  const spanLengthsM = watch('spanLengthsM')

  function onSubmit(data: FastSolverFormValues) {
    mutation.mutate(data)
  }

  const response = mutation.data
  const totalLengthM = spanLengthsM.reduce((a, b) => a + (b || 0), 0)
  const equilibriumOk =
    response && Math.abs(response.totalAppliedLoadKn - response.totalReactionKn) < Math.abs(response.totalAppliedLoadKn) * 1e-6

  return (
    // noValidate: without it, the browser's own number-input step
    // validation (default step=1) silently blocks submission for any
    // fractional value (e.g. capBeamDepthM=1.5) before React ever sees
    // the submit event - Zod is the single source of validation truth
    // here, not native HTML5 constraints.
    <form className="spn-workflow" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="spn-card">
        <h2 className="spn-card-title">Bridge model</h2>
        <p className="spn-card-subtitle">
          Linear-elastic 3D frame, direct stiffness method - deck + columns + cap beams as 1D frame
          elements, bearings as elastic links, fixed column bases. Total length {totalLengthM} m.
        </p>
        <div className="spn-field-grid">
          {initialForm.spanLengthsM.map((_, i) => (
            <Field key={i} label={`Span ${i + 1} (m)`} registration={register(`spanLengthsM.${i}`, { valueAsNumber: true })} error={errors.spanLengthsM?.[i]?.message} />
          ))}
        </div>
        <div className="spn-field-grid">
          {initialForm.pierHeightsM.map((_, i) => (
            <Field key={i} label={`P${i + 1} height (m)`} registration={register(`pierHeightsM.${i}`, { valueAsNumber: true })} error={errors.pierHeightsM?.[i]?.message} />
          ))}
        </div>
        <div className="spn-field-grid">
          <Field label="Deck width (m)" registration={register('deckWidthM', { valueAsNumber: true })} error={errors.deckWidthM?.message} />
          <Field label="Deck thickness (m)" registration={register('deckThicknessM', { valueAsNumber: true })} error={errors.deckThicknessM?.message} />
          <Field label="SDL (kN/m)" registration={register('sdlKnPerM', { valueAsNumber: true })} error={errors.sdlKnPerM?.message} />
          <Field label="Concrete fck (MPa)" registration={register('concreteFckMpa', { valueAsNumber: true })} error={errors.concreteFckMpa?.message} />
        </div>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Pier geometry</h2>
        <p className="spn-card-subtitle">Each pier: 2 rectangular columns + cap beam, fixed at the base.</p>
        <div className="spn-field-grid">
          <Field label="Column - longitudinal (m)" registration={register('columnLongitudinalM', { valueAsNumber: true })} error={errors.columnLongitudinalM?.message} />
          <Field label="Column - transverse (m)" registration={register('columnTransverseM', { valueAsNumber: true })} error={errors.columnTransverseM?.message} />
          <Field label="Column spacing (m)" registration={register('columnSpacingTransverseM', { valueAsNumber: true })} error={errors.columnSpacingTransverseM?.message} />
          <Field label="Cap beam width (m)" registration={register('capBeamWidthM', { valueAsNumber: true })} error={errors.capBeamWidthM?.message} />
          <Field label="Cap beam depth (m)" registration={register('capBeamDepthM', { valueAsNumber: true })} error={errors.capBeamDepthM?.message} />
        </div>
      </div>

      <div className="spn-card">
        <h2 className="spn-card-title">Bearing / elastic-link stiffness (at all supports)</h2>
        <div className="spn-field-grid">
          <Field label="Kx (kN/m)" registration={register('bearingKx', { valueAsNumber: true })} />
          <Field label="Ky (kN/m)" registration={register('bearingKy', { valueAsNumber: true })} />
          <Field label="Kz (kN/m)" registration={register('bearingKz', { valueAsNumber: true })} />
          <Field label="Krx (kN.m/rad)" registration={register('bearingKrx', { valueAsNumber: true })} />
          <Field label="Kry (kN.m/rad)" registration={register('bearingKry', { valueAsNumber: true })} />
          <Field label="Krz (kN.m/rad)" registration={register('bearingKrz', { valueAsNumber: true })} />
        </div>
      </div>

      <button type="submit" className="spn-button-primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'RUNNING…' : 'RUN ANALYSIS'}
      </button>

      {mutation.isError && (
        <p className="spn-error">
          {mutation.error instanceof Error ? `${mutation.error.message} - is the backend running?` : 'Unknown error'}
        </p>
      )}
      {response && response.status !== 'COMPLETED' && (
        <p className="spn-error">{response.errorMessage ?? `Solver status: ${response.status}`}</p>
      )}

      {response && response.status === 'COMPLETED' && (
        <>
          <div className="spn-card">
            <h2 className="spn-card-title">Equilibrium check</h2>
            <p className={equilibriumOk ? 'spn-hint' : 'spn-error'}>
              Total applied load (self-weight + SDL, from geometry): {response.totalAppliedLoadKn.toFixed(2)} kN. Total
              vertical reaction: {response.totalReactionKn.toFixed(2)} kN.{' '}
              {equilibriumOk ? 'Match - model is in equilibrium.' : 'MISMATCH - check the model.'}
            </p>
          </div>

          <div className="spn-card">
            <h2 className="spn-card-title">Support reactions</h2>
            <table className="spn-table">
              <thead>
                <tr>
                  {['Support', 'Chainage (m)', 'Fx (kN)', 'Fy (kN)', 'Fz (kN)', 'Mx (kN.m)', 'My (kN.m)', 'Mz (kN.m)'].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {response.reactions.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.chainageM.toFixed(1)}</td>
                    <td>{r.fx.toFixed(2)}</td>
                    <td>{r.fy.toFixed(2)}</td>
                    <td>{r.fz.toFixed(2)}</td>
                    <td>{r.mx.toFixed(1)}</td>
                    <td>{r.my.toFixed(1)}</td>
                    <td>{r.mz.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="spn-card">
            <h2 className="spn-card-title">Deck displacements</h2>
            <table className="spn-table">
              <thead>
                <tr>
                  {['Node', 'Chainage (m)', 'dz (m)', 'ry (rad)'].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {response.deckDisplacements.map((d) => (
                  <tr key={d.label}>
                    <td>{d.label}</td>
                    <td>{d.chainageM.toFixed(1)}</td>
                    <td>{d.dz.toFixed(5)}</td>
                    <td>{d.ry.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </form>
  )
}

function Field({ label, registration, error }: { label: string; registration: UseFormRegisterReturn; error?: string }) {
  return (
    <label className="spn-field">
      <span>{label}</span>
      <input type="number" {...registration} className="spn-input" />
      {error && <span className="spn-error" style={{ fontSize: 11 }}>{error}</span>}
    </label>
  )
}
