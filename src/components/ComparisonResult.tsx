import Check from 'lucide-react/dist/esm/icons/check.js'
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert.js'
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert.js'
import type { XmlComparisonResult } from '../lib/compareXml'

type ComparisonResultProps = { result: XmlComparisonResult; leftName: string; rightName: string }

export function ComparisonResult({ result, leftName, rightName }: ComparisonResultProps) {
  if (result.status === 'equal') {
    return (
      <div className="result-band result-equal">
        <span className="result-icon success-icon"><Check aria-hidden="true" /></span>
        <div><h2>Files match</h2><p>Both files contain the same XML content.</p></div>
      </div>
    )
  }

  if (result.status === 'invalid') {
    return (
      <div className="result-band result-invalid">
        <span className="result-icon"><CircleAlert aria-hidden="true" /></span>
        <div className="result-details"><h2>XML couldn't be read</h2><p className="invalid-filename">{result.file === 'left' ? leftName : rightName}</p><pre><code>{result.message}</code></pre></div>
      </div>
    )
  }

  return (
    <div className="result-band result-different">
      <span className="result-icon"><TriangleAlert aria-hidden="true" /></span>
      <div className="result-details">
        <h2>Files are different</h2>
        <p>{result.reason}</p>
        <p className="mismatch-path"><code>{result.path}</code></p>
        <div className="value-pair">
          <div><h3>Left · {leftName}</h3><pre><code>{result.leftValue}</code></pre></div>
          <div><h3>Right · {rightName}</h3><pre><code>{result.rightValue}</code></pre></div>
        </div>
      </div>
    </div>
  )
}
