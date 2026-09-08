import { useRef, useState } from 'react'
import CodeXml from 'lucide-react/dist/esm/icons/code-xml.js'
import ArrowLeftRight from 'lucide-react/dist/esm/icons/arrow-left-right.js'
import { FileDropzone } from './components/FileDropzone'
import { ComparisonResult } from './components/ComparisonResult'
import { compareXml } from './lib/compareXml'
import type { XmlComparisonResult } from './lib/compareXml'

type Side = 'left' | 'right'
type Selection = { file: File | null; error: string | null }
const EMPTY_SELECTION: Selection = { file: null, error: null }

async function readFile(file: File) {
  try {
    return { text: await file.text(), error: null }
  } catch (error) {
    return { text: null, error: `${file.name}: ${error instanceof Error ? error.message : "XML couldn't be read"}` }
  }
}

export default function App() {
  const [left, setLeft] = useState<Selection>(EMPTY_SELECTION)
  const [right, setRight] = useState<Selection>(EMPTY_SELECTION)
  const [result, setResult] = useState<XmlComparisonResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const revision = useRef(0)

  function changeFile(side: Side, file: File | null) {
    revision.current += 1
    setResult(null)
    setIsComparing(false)
    const update = side === 'left' ? setLeft : setRight
    if (file && !/\.xml$/i.test(file.name)) {
      update({ file: null, error: 'Choose an .xml file.' })
      return
    }
    update({ file, error: null })
  }

  async function compareFiles() {
    if (!left.file || !right.file || isComparing) return
    const currentRevision = ++revision.current
    setIsComparing(true)
    setResult(null)
    setLeft({ file: left.file, error: null })
    setRight({ file: right.file, error: null })
    const [leftRead, rightRead] = await Promise.all([readFile(left.file), readFile(right.file)])
    if (currentRevision !== revision.current) return
    setIsComparing(false)
    if (leftRead.error || rightRead.error) {
      setLeft({ file: left.file, error: leftRead.error })
      setRight({ file: right.file, error: rightRead.error })
      return
    }
    setResult(compareXml(leftRead.text!, rightRead.text!))
  }

  return (
    <div className="page-shell">
      <header className="brand"><CodeXml aria-hidden="true" /><span>XML Compare</span></header>
      <main>
        <div className="intro">
          <h1>Compare XML files with confidence</h1>
          <p>Formatting differences are ignored. Your files never leave this browser.</p>
        </div>
        <section className="work-surface" aria-label="XML comparison">
          <div className="file-pair">
            <FileDropzone label="First XML file" file={left.file} error={left.error} onFile={file => changeFile('left', file)} onRemove={() => changeFile('left', null)} />
            <div className="connector" aria-hidden="true"><ArrowLeftRight /></div>
            <FileDropzone label="Second XML file" file={right.file} error={right.error} onFile={file => changeFile('right', file)} onRemove={() => changeFile('right', null)} />
          </div>
          <button className="compare-button" type="button" disabled={!left.file || !right.file || isComparing} aria-busy={isComparing} onClick={compareFiles}>
            <ArrowLeftRight aria-hidden="true" className={isComparing ? 'busy-icon' : undefined} />Compare files
          </button>
          <div className="result-region" role="region" aria-label="Comparison result" aria-live="polite" aria-atomic="true">
            {result ? <ComparisonResult result={result} leftName={left.file?.name ?? ''} rightName={right.file?.name ?? ''} /> : null}
          </div>
        </section>
      </main>
      <footer>Private by design · Processed locally in your browser</footer>
    </div>
  )
}
