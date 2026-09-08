export type XmlComparisonResult =
  | { status: 'equal' }
  | { status: 'different'; path: string; reason: string; leftValue: string; rightValue: string }
  | { status: 'invalid'; file: 'left' | 'right'; message: string }

type ComparableNode = Element | Text | Comment | ProcessingInstruction

export function compareXml(left: string, right: string): XmlComparisonResult {
  const leftDocument = parse(left)
  if (typeof leftDocument === 'string') return { status: 'invalid', file: 'left', message: leftDocument }

  const rightDocument = parse(right)
  if (typeof rightDocument === 'string') return { status: 'invalid', file: 'right', message: rightDocument }

  return compareNode(leftDocument.documentElement, rightDocument.documentElement, `/${nodeName(leftDocument.documentElement)}[1]`)
}

function parse(xml: string): XMLDocument | string {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const parserError = document.querySelector('parsererror')
  return parserError ? parserError.textContent ?? 'Invalid XML' : document
}

function compareNode(left: ComparableNode, right: ComparableNode, path: string): XmlComparisonResult {
  if (left.nodeType !== right.nodeType) return difference(path, 'Node types differ', nodeValue(left), nodeValue(right))

  if (left.nodeType === Node.TEXT_NODE) {
    return left.data === (right as Text).data
      ? { status: 'equal' }
      : difference(path, 'Text values differ', left.data, (right as Text).data)
  }

  if (left.nodeType === Node.COMMENT_NODE || left.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    return nodeValue(left) === nodeValue(right)
      ? { status: 'equal' }
      : difference(path, 'Node values differ', nodeValue(left), nodeValue(right))
  }

  const leftElement = left as Element
  const rightElement = right as Element
  if (leftElement.namespaceURI !== rightElement.namespaceURI || leftElement.localName !== rightElement.localName) {
    return difference(path, 'Element names differ', nodeName(leftElement), nodeName(rightElement))
  }

  const attributeResult = compareAttributes(leftElement, rightElement, path)
  if (attributeResult.status !== 'equal') return attributeResult

  const leftChildren = childrenOf(leftElement)
  const rightChildren = childrenOf(rightElement)
  if (leftChildren.length !== rightChildren.length) {
    return difference(path, 'Child counts differ', String(leftChildren.length), String(rightChildren.length))
  }

  let textIndex = 0
  for (let index = 0; index < leftChildren.length; index += 1) {
    const leftChild = leftChildren[index]
    const rightChild = rightChildren[index]
    const childPath = leftChild.nodeType === Node.TEXT_NODE
      ? `${path}/text()[${++textIndex}]`
      : leftChild.nodeType === Node.ELEMENT_NODE && rightChild.nodeType === Node.ELEMENT_NODE && nodeName(leftChild) === nodeName(rightChild)
        ? `${path}/${nodeName(leftChild)}[${elementIndex(leftChildren, index)}]`
        : `${path}/*[${index + 1}]`
    const childResult = compareNode(leftChild, rightChild, childPath)
    if (childResult.status !== 'equal') return childResult
  }

  return { status: 'equal' }
}

function compareAttributes(left: Element, right: Element, path: string): XmlComparisonResult {
  const leftAttributes = Array.from(left.attributes).sort(compareAttribute)
  const rightAttributes = Array.from(right.attributes).sort(compareAttribute)
  if (leftAttributes.length !== rightAttributes.length) {
    return difference(path, 'Attribute counts differ', String(leftAttributes.length), String(rightAttributes.length))
  }

  for (let index = 0; index < leftAttributes.length; index += 1) {
    const leftAttribute = leftAttributes[index]
    const rightAttribute = rightAttributes[index]
    if (leftAttribute.namespaceURI !== rightAttribute.namespaceURI || leftAttribute.localName !== rightAttribute.localName) {
      return difference(path, 'Attribute names differ', leftAttribute.name, rightAttribute.name)
    }
    if (leftAttribute.value !== rightAttribute.value) {
      return difference(path, `Attribute ${leftAttribute.name} values differ`, leftAttribute.value, rightAttribute.value)
    }
  }
  return { status: 'equal' }
}

function compareAttribute(left: Attr, right: Attr): number {
  const namespaceComparison = (left.namespaceURI ?? '').localeCompare(right.namespaceURI ?? '')
  return namespaceComparison === 0 ? left.localName.localeCompare(right.localName) : namespaceComparison
}

function childrenOf(element: Element): ComparableNode[] {
  return Array.from(element.childNodes).flatMap((child): ComparableNode[] => {
    if (child.nodeType === Node.CDATA_SECTION_NODE || child.nodeType === Node.TEXT_NODE) {
      return /^\s*$/.test(child.nodeValue ?? '') ? [] : [element.ownerDocument!.createTextNode(child.nodeValue ?? '')]
    }
    return child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.COMMENT_NODE || child.nodeType === Node.PROCESSING_INSTRUCTION_NODE
      ? [child as ComparableNode]
      : []
  })
}

function elementIndex(children: ComparableNode[], index: number): number {
  const name = nodeName(children[index])
  return children.slice(0, index + 1).filter((child) => child.nodeType === Node.ELEMENT_NODE && nodeName(child) === name).length
}

function nodeName(node: Node): string {
  return node.nodeName
}

function nodeValue(node: Node): string {
  return node.nodeValue ?? ''
}

function difference(path: string, reason: string, leftValue: string, rightValue: string): XmlComparisonResult {
  return { status: 'different', path, reason, leftValue, rightValue }
}
