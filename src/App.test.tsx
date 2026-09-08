import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

// jsdom does not implement Blob.text(); read the actual test file bytes.
function xmlFile(content: string, name = 'first.xml'): File {
  const file = new File([content], name, { type: 'text/xml' })
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: () => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }),
  })
  return file
}

function select(side: 'first' | 'second', file: File) {
  fireEvent.change(screen.getByLabelText(`Choose ${side} XML file`), { target: { files: [file] } })
}

function selectPair(left = '<root><item/></root>', right = '<root>\n  <item/>\n</root>') {
  select('first', xmlFile(left))
  select('second', xmlFile(right, 'second.xml'))
}

describe('XML comparison workflow', () => {
  it('requires both files, then reports an XML match despite formatting differences', async () => {
    render(<App />)
    const compare = screen.getByRole('button', { name: /compare files/i })
    expect(compare).toBeDisabled()
    select('first', xmlFile('<root><item/></root>'))
    expect(compare).toBeDisabled()
    select('second', xmlFile('<root>\n  <item/>\n</root>', 'second.xml'))
    expect(compare).toBeEnabled()
    fireEvent.click(compare)
    expect(await screen.findByRole('heading', { name: 'Files match' })).toBeVisible()
    expect(screen.getByRole('region', { name: /comparison result/i })).toHaveAttribute('aria-live', 'polite')
  })

  it('shows the first mismatch path, reason, and labeled values', async () => {
    render(<App />)
    selectPair('<root>left content</root>', '<root>right content</root>')
    fireEvent.click(screen.getByRole('button', { name: /compare files/i }))
    expect(await screen.findByRole('heading', { name: 'Files are different' })).toBeVisible()
    const result = screen.getByRole('region', { name: /comparison result/i })
    expect(within(result).getByText('/root[1]/text()[1]')).toBeVisible()
    expect(within(result).getByText('Text values differ')).toBeVisible()
    expect(within(result).getByText('Left · first.xml')).toBeVisible()
    expect(within(result).getByText('Right · second.xml')).toBeVisible()
    expect(within(result).getByText('left content', { selector: 'code' })).toBeVisible()
    expect(within(result).getByText('right content', { selector: 'code' })).toBeVisible()
  })

  it('identifies the failing filename and parser message for malformed XML', async () => {
    render(<App />)
    selectPair('<root/>', '<root>')
    fireEvent.click(screen.getByRole('button', { name: /compare files/i }))
    expect(await screen.findByRole('heading', { name: "XML couldn't be read" })).toBeVisible()
    const result = screen.getByRole('region', { name: /comparison result/i })
    expect(within(result).getByText('second.xml')).toBeVisible()
    expect(within(result).getByText(/unclosed tag/i)).toBeVisible()
  })

  it('rejects non-XML files with a selection error', () => {
    render(<App />)
    select('first', new File(['notes'], 'notes.txt', { type: 'text/plain' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/choose an .xml file/i)
    expect(screen.queryByRole('button', { name: /remove first/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compare files/i })).toBeDisabled()
  })

  it('accepts uppercase XML extensions and displays readable size and named actions', () => {
    render(<App />)
    select('first', xmlFile('x'.repeat(2458), 'SOURCE.XML'))
    expect(screen.getByText('SOURCE.XML')).toBeVisible()
    expect(screen.getByText('XML · 2.4 KB')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Replace first XML file' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove first XML file' })).toBeVisible()
    expect(screen.getByLabelText('Choose first XML file')).toHaveAttribute('accept', '.xml,text/xml,application/xml')
  })

  it('clears the previous result when replacing a file', async () => {
    render(<App />)
    selectPair()
    fireEvent.click(screen.getByRole('button', { name: /compare files/i }))
    await screen.findByRole('heading', { name: 'Files match' })
    select('second', xmlFile('<root>new</root>', 'replacement.xml'))
    expect(screen.queryByRole('heading', { name: 'Files match' })).not.toBeInTheDocument()
    expect(screen.getByText('replacement.xml')).toBeVisible()
  })

  it('removes a selected file, clears the result, and disables comparison', async () => {
    render(<App />)
    selectPair()
    fireEvent.click(screen.getByRole('button', { name: /compare files/i }))
    await screen.findByRole('heading', { name: 'Files match' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove first XML file' }))
    expect(screen.queryByText('first.xml')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Files match' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compare files/i })).toBeDisabled()
  })

  it('supports drag enter, leave, and dropping a file', () => {
    render(<App />)
    const region = screen.getByRole('group', { name: 'First XML file' })
    fireEvent.dragEnter(region, { dataTransfer: { types: ['Files'] } })
    expect(region).toHaveClass('is-dragging')
    fireEvent.dragLeave(region)
    expect(region).not.toHaveClass('is-dragging')
    fireEvent.drop(region, { dataTransfer: { files: [xmlFile('<root/>', 'dropped.xml')] } })
    expect(screen.getByText('dropped.xml')).toBeVisible()
  })

  it('maps a file read failure to the affected side', async () => {
    render(<App />)
    const unreadable = xmlFile('<root/>', 'unreadable.xml')
    Object.defineProperty(unreadable, 'text', { value: () => Promise.reject(new Error('Access denied')) })
    select('first', xmlFile('<root/>'))
    select('second', unreadable)
    fireEvent.click(screen.getByRole('button', { name: /compare files/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Access denied'))
    expect(within(screen.getByRole('group', { name: 'Second XML file' })).getByRole('alert')).toHaveTextContent('unreadable.xml')
    expect(screen.queryByRole('heading', { name: 'Files match' })).not.toBeInTheDocument()
  })

  it('reads files concurrently, disables duplicate comparisons, and discards stale work', async () => {
    render(<App />)
    let finishLeft!: (text: string) => void
    let finishRight!: (text: string) => void
    let rightReadStarted = false
    const left = xmlFile('<root/>')
    const right = xmlFile('<root/>', 'second.xml')
    Object.defineProperty(left, 'text', { value: () => new Promise<string>(resolve => { finishLeft = resolve }) })
    Object.defineProperty(right, 'text', { value: () => {
      rightReadStarted = true
      return new Promise<string>(resolve => { finishRight = resolve })
    } })
    select('first', left)
    select('second', right)
    const compare = screen.getByRole('button', { name: /compare files/i })
    fireEvent.click(compare)
    expect(rightReadStarted).toBe(true)
    expect(compare).toBeDisabled()
    expect(compare).toHaveAttribute('aria-busy', 'true')
    select('first', xmlFile('<changed/>', 'new.xml'))
    await act(async () => { finishLeft('<root/>'); finishRight('<root/>') })
    expect(screen.queryByRole('heading', { name: 'Files match' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compare files/i })).toBeEnabled()
  })
})
