import katex from 'katex'
import 'katex/dist/katex.min.css'

const spectrumFormula = String.raw`S_e(T)=\begin{cases}a_g S\left[1+\dfrac{T}{T_B}(2.5\eta-1)\right],&0\leq T\leq T_B\\[8pt]a_g S\,2.5\eta,&T_B\leq T\leq T_C\\[8pt]a_g S\,2.5\eta\dfrac{T_C}{T},&T_C\leq T\leq T_D\\[8pt]a_g S\,2.5\eta\dfrac{T_CT_D}{T^2},&T_D\leq T\leq4.0\,s\end{cases}`

export default function SeismicMathFormula() {
  const html = katex.renderToString(spectrumFormula, { displayMode: true, throwOnError: false, output: 'htmlAndMathml' })
  return <div className="spn-seismic-katex" dangerouslySetInnerHTML={{ __html: html }} aria-label="Elastic response spectrum equations" />
}
