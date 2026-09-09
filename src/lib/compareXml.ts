export type XmlComparisonResult =
  | { status: 'equal' }
  | { status: 'different'; path: string; reason: string; leftValue: string; rightValue: string }
  | { status: 'invalid'; file: 'left' | 'right'; message: string }

type ComparableNode = Element | Text | Comment | ProcessingInstruction
type ComparableParent = XMLDocument | Element

const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace'
const PARSER_ERROR_NAMESPACE = 'http://www.mozilla.org/newlayout/xml/parsererror.xml'

export function compareXml(left: string, right: string): XmlComparisonResult {
  const leftDocument = parse(left)
  if (typeof leftDocument === 'string') return { status: 'invalid', file: 'left', message: leftDocument }

  const rightDocument = parse(right)
  if (typeof rightDocument === 'string') return { status: 'invalid', file: 'right', message: rightDocument }

  return compareChildren(leftDocument, rightDocument, '')
}

function parse(xml: string): XMLDocument | string {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const parserError = document.getElementsByTagNameNS(PARSER_ERROR_NAMESPACE, 'parsererror')[0]
  return parserError ? parserError.textContent ?? 'Invalid XML' : document
}

function compareNode(left: ComparableNode, right: ComparableNode, path: string): XmlComparisonResult {
  if (left.nodeType !== right.nodeType) return difference(path, 'Node types differ', nodeValue(left), nodeValue(right))

  if (left.nodeType === Node.TEXT_NODE) {
    const leftText = left as Text
    const rightText = right as Text
    return leftText.data === rightText.data
      ? { status: 'equal' }
      : difference(path, 'Text values differ', leftText.data, rightText.data)
  }

  if (left.nodeType === Node.COMMENT_NODE) {
    const leftComment = left as Comment
    const rightComment = right as Comment
    return leftComment.data === rightComment.data
      ? { status: 'equal' }
      : difference(path, 'Comment values differ', leftComment.data, rightComment.data)
  }

  if (left.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    const leftInstruction = left as ProcessingInstruction
    const rightInstruction = right as ProcessingInstruction
    if (leftInstruction.target !== rightInstruction.target) {
      return difference(path, 'Processing instruction targets differ', leftInstruction.target, rightInstruction.target)
    }
    return leftInstruction.data === rightInstruction.data
      ? { status: 'equal' }
      : difference(path, 'Processing instruction values differ', leftInstruction.data, rightInstruction.data)
  }

  const leftElement = left as Element
  const rightElement = right as Element
  if (leftElement.namespaceURI !== rightElement.namespaceURI || leftElement.localName !== rightElement.localName) {
    return difference(path, 'Element names differ', expandedName(leftElement), expandedName(rightElement))
  }

  const attributeResult = compareAttributes(leftElement, rightElement, path)
  return attributeResult.status === 'equal' ? compareChildren(leftElement, rightElement, path) : attributeResult
}

function compareChildren(leftParent: ComparableParent, rightParent: ComparableParent, path: string): XmlComparisonResult {
  const leftChildren = childrenOf(leftParent)
  const rightChildren = childrenOf(rightParent)
  let textIndex = 0

  for (let index = 0; index < Math.max(leftChildren.length, rightChildren.length); index += 1) {
    const leftChild = leftChildren[index]
    const rightChild = rightChildren[index]
    const child = leftChild ?? rightChild
    if (!child) continue

    const childPath = pathForChild(
      path,
      child,
      leftChild,
      rightChild,
      leftChild ? leftChildren : rightChildren,
      index,
      child.nodeType === Node.TEXT_NODE ? ++textIndex : textIndex,
    )
    if (!leftChild || !rightChild) {
      return difference(childPath, 'Child counts differ', leftChild ? nodeValue(leftChild) : '', rightChild ? nodeValue(rightChild) : '')
    }

    const childResult = compareNode(leftChild, rightChild, childPath)
    if (childResult.status !== 'equal') return childResult
  }

  return { status: 'equal' }
}

function pathForChild(
  parentPath: string,
  child: ComparableNode,
  leftChild: ComparableNode | undefined,
  rightChild: ComparableNode | undefined,
  siblings: ComparableNode[],
  index: number,
  textIndex: number,
): string {
  if (child.nodeType === Node.TEXT_NODE) return `${parentPath}/text()[${textIndex}]`
  if (leftChild?.nodeType === Node.ELEMENT_NODE && rightChild?.nodeType === Node.ELEMENT_NODE && nodeName(leftChild) === nodeName(rightChild)) {
    return `${parentPath}/${nodeName(leftChild)}[${elementIndex(siblings, index)}]`
  }
  if (!leftChild || !rightChild) {
    return child.nodeType === Node.ELEMENT_NODE
      ? `${parentPath}/${nodeName(child)}[${elementIndex(siblings, index)}]`
      : `${parentPath}/*[${index + 1}]`
  }
  return `${parentPath}/*[${index + 1}]`
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
      return difference(path, 'Attribute names differ', expandedName(leftAttribute), expandedName(rightAttribute))
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

function childrenOf(parent: ComparableParent): ComparableNode[] {
  const children: ComparableNode[] = []
  const document = parent.nodeType === Node.DOCUMENT_NODE ? parent as XMLDocument : parent.ownerDocument!
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.CDATA_SECTION_NODE || child.nodeType === Node.TEXT_NODE) {
      const previous = children[children.length - 1]
      if (previous?.nodeType === Node.TEXT_NODE) {
        (previous as Text).appendData(child.nodeValue ?? '')
      } else {
        children.push(document.createTextNode(child.nodeValue ?? ''))
      }
    } else if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.COMMENT_NODE || child.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      children.push(child as ComparableNode)
    }
  }
  // Coalesce text/CDATA first so whitespace adjacent to meaningful text survives.
  const hasElementChild = children.some(child => child.nodeType === Node.ELEMENT_NODE)
  const ignoreWhitespace = shouldIgnoreWhitespace(parent, hasElementChild)
  return children.filter(child => !(ignoreWhitespace && child.nodeType === Node.TEXT_NODE && /^[\t\n\r ]*$/.test(child.nodeValue ?? '')))
}

function shouldIgnoreWhitespace(parent: ComparableParent, hasElementChild: boolean): boolean {
  return parent.nodeType === Node.DOCUMENT_NODE || (hasElementChild && !preservesWhitespace(parent as Element))
}

function preservesWhitespace(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const value = current.getAttributeNS(XML_NAMESPACE, 'space')
    if (value === 'preserve') return true
    if (value === 'default') return false
  }
  return false
}

function elementIndex(children: ComparableNode[], index: number): number {
  const name = nodeName(children[index])
  return children.slice(0, index + 1).filter((child) => child.nodeType === Node.ELEMENT_NODE && nodeName(child) === name).length
}

function nodeName(node: Node): string {
  return node.nodeName
}

function expandedName(node: Element | Attr): string {
  return node.namespaceURI ? `{${node.namespaceURI}}${node.localName}` : node.localName
}

function nodeValue(node: Node): string {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const name = expandedName(node as Element)
    return node.hasChildNodes() ? `<${name}>…</${name}>` : `<${name}/>`
  }
  return node.nodeValue ?? ''
}

function difference(path: string, reason: string, leftValue: string, rightValue: string): XmlComparisonResult {
  return { status: 'different', path, reason, leftValue, rightValue }
}
