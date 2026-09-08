import { useId, useRef, useState } from 'react'
import FileIcon from 'lucide-react/dist/esm/icons/file.js'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'

type FileDropzoneProps = {
  label: string
  file: File | null
  error: string | null
  onFile: (file: File) => void
  onRemove: () => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileDropzone({ label, file, error, onFile, onRemove }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const id = useId()
  const accessibleLabel = label.charAt(0).toLowerCase() + label.slice(1)

  return (
    <div
      className={`file-zone${isDragging ? ' is-dragging' : ''}${error ? ' has-error' : ''}`}
      role="group"
      aria-label={label}
      onDragEnter={event => {
        event.preventDefault()
        dragDepth.current += 1
        setIsDragging(true)
      }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
      onDragLeave={event => {
        event.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setIsDragging(false)
      }}
      onDrop={event => {
        event.preventDefault()
        dragDepth.current = 0
        setIsDragging(false)
        const dropped = event.dataTransfer.files[0]
        if (dropped) onFile(dropped)
      }}
    >
      <h2>{label}</h2>
      <input
        ref={inputRef}
        id={id}
        className="file-input"
        type="file"
        accept=".xml,text/xml,application/xml"
        aria-label={`Choose ${accessibleLabel}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        tabIndex={-1}
        onChange={event => {
          const selected = event.target.files?.[0]
          if (selected) onFile(selected)
          event.target.value = ''
        }}
      />
      {file ? (
        <div className="document-panel selected-panel">
          <div className="file-identity" aria-live="polite">
            <FileIcon className="document-icon" aria-hidden="true" />
            <div className="file-details"><p className="file-name">{file.name}</p><p className="file-size">XML · {formatSize(file.size)}</p></div>
          </div>
          <div className="file-actions">
            <button type="button" className="replace-button" aria-label={`Replace ${accessibleLabel}`} onClick={() => inputRef.current?.click()}><RefreshCw aria-hidden="true" />Replace</button>
            <button type="button" className="remove-button" aria-label={`Remove ${accessibleLabel}`} onClick={onRemove}><Trash2 aria-hidden="true" />Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="document-panel empty-panel" aria-label={`Browse for ${accessibleLabel}`} aria-describedby={error ? `${id}-error` : undefined} onClick={() => inputRef.current?.click()}>
          <FileIcon className="document-icon" aria-hidden="true" />
          <span className="empty-title">Drop your XML file here</span>
          <span className="empty-hint">or click to browse</span>
          <span className="choose-label">Choose XML file</span>
        </button>
      )}
      {error ? <p className="selection-error" id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  )
}
