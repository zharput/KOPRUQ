import { useLoadGroups } from '../../hooks/useLoadGroups'

/**
 * Traffic > Load Groups - EN 1991-2 Table 4.4a/b group-of-loads
 * architecture, kept as its own section separate from EN 1990 load
 * combinations (a distinct, future Combination Engine module - the
 * engineer's own architectural instruction). No group membership is
 * populated in P01 - the backend's `TrafficLoadGroupCatalog` returns
 * only the six standard group codes with `status: NOT_DEFINED` and no
 * components, and this panel shows that honestly rather than guessing
 * at EN 1991-2's actual group rules from memory (spec section 22).
 */
export default function LoadGroupsPanel() {
  const { data: groups, isLoading, isError } = useLoadGroups()

  return (
    <div className="spn-card">
      <h2 className="spn-card-title">Load Groups</h2>
      <p className="spn-card-subtitle">
        Groups of compatible traffic actions (EN 1991-2 Table 4.4a/b). Kept separate from EN 1990 load
        combinations, which are a different, future module. Group membership below is not yet defined - it awaits
        validated EN 1991-2 group rules from the engineer and is never guessed.
      </p>

      {isLoading && <p className="spn-card-subtitle">Loading...</p>}
      {isError && <p className="spn-card-subtitle">Could not load load groups from the backend.</p>}

      {groups && (
        <table className="spn-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Components</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.code}>
                <td>{group.code}</td>
                <td>{group.description}</td>
                <td>{group.components.length === 0 ? '—' : group.components.length}</td>
                <td>
                  <span className="spn-badge spn-badge-code">{group.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
