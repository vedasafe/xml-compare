import { describe, expect, it, vi } from 'vitest'
import { compareXml } from './compareXml'

describe('compareXml', () => {
  it('ignores whitespace-only text nodes between elements', () => {
    expect(compareXml('<root><item id="1">A</item></root>', '<root>\n  <item id="1">A</item>\n</root>')).toEqual({ status: 'equal' })
  })

  it('ignores attribute order', () => {
    expect(compareXml('<root a="1" b="2"/>', '<root b="2" a="1"/>')).toEqual({ status: 'equal' })
  })

  it('preserves whitespace in meaningful text', () => {
    expect(compareXml('<root>A B</root>', '<root>AB</root>')).toMatchObject({ status: 'different', path: '/root[1]/text()[1]' })
  })

  it('reports ordered element differences', () => {
    expect(compareXml('<root><a/><b/></root>', '<root><b/><a/></root>')).toMatchObject({ status: 'different', path: '/root[1]/*[1]' })
  })

  it('compares namespace declarations', () => {
    expect(compareXml('<x:root xmlns:x="urn:a"/>', '<x:root xmlns:x="urn:b"/>')).toMatchObject({
      status: 'different', leftValue: '{urn:a}root', rightValue: '{urn:b}root',
    })
  })

  it('shows expanded attribute names when namespace URIs differ', () => {
    expect(compareXml('<root xmlns:x="a" x:id="1"/>', '<root xmlns:x="b" x:id="1"/>')).toMatchObject({
      status: 'different', reason: 'Attribute names differ', leftValue: '{a}id', rightValue: '{b}id',
    })
  })

  it.each([
    ['<root/>', '<root><a/></root>', '/root[1]/a[1]', '', '<a/>'],
    ['<root><a/></root>', '<root/>', '/root[1]/a[1]', '<a/>', ''],
    ['<root><a/></root>', '<root><a/><a/></root>', '/root[1]/a[2]', '', '<a/>'],
    ['<root><a/><a/></root>', '<root><a/></root>', '/root[1]/a[2]', '<a/>', ''],
  ])('reports missing or extra elements: %s versus %s', (left, right, path, leftValue, rightValue) => {
    expect(compareXml(left, right)).toMatchObject({ status: 'different', path, leftValue, rightValue })
  })

  it('shows a concise namespace-aware value for an extra element', () => {
    expect(compareXml('<root/>', '<root><a xmlns="urn:a"><nested/></a></root>')).toMatchObject({
      status: 'different', path: '/root[1]/a[1]', leftValue: '', rightValue: '<{urn:a}a>…</{urn:a}a>',
    })
  })

  it.each(['&#160;', '&#8195;'])('preserves non-XML whitespace %s between elements', whitespace => {
    expect(compareXml(`<root><a/>${whitespace}<b/></root>`, '<root><a/><b/></root>')).toMatchObject({ status: 'different' })
  })

  it('compares comments', () => {
    expect(compareXml('<root><!--a--></root>', '<root><!--b--></root>')).toMatchObject({ status: 'different' })
  })

  it('compares processing instructions', () => {
    expect(compareXml('<root><?mode a?></root>', '<root><?mode b?></root>')).toMatchObject({ status: 'different' })
  })

  it('compares processing instruction targets', () => {
    expect(compareXml('<root><?alpha value?></root>', '<root><?beta value?></root>')).toMatchObject({ status: 'different' })
  })

  it('compares document-level comments', () => {
    expect(compareXml('<!--before--><root/>', '<!--after--><root/>')).toMatchObject({ status: 'different' })
  })

  it('preserves whitespace-only leaf text', () => {
    expect(compareXml('<root> </root>', '<root/>')).toMatchObject({ status: 'different', path: '/root[1]/text()[1]' })
  })

  it('preserves whitespace when xml:space is preserve', () => {
    expect(compareXml('<root xml:space="preserve"> </root>', '<root xml:space="preserve"/>')).toMatchObject({ status: 'different', path: '/root[1]/text()[1]' })
  })

  it('numbers text paths independently of preceding element children', () => {
    expect(compareXml('<root><item/>left</root>', '<root><item/>right</root>')).toMatchObject({ status: 'different', path: '/root[1]/text()[1]' })
  })

  it('treats CDATA and text as equivalent', () => {
    expect(compareXml('<root><![CDATA[value]]></root>', '<root>value</root>')).toEqual({ status: 'equal' })
  })

  it.each([
    ['<root>A<![CDATA[B]]>C</root>', '<root>ABC</root>'],
    ['<root>ABC</root>', '<root><![CDATA[A]]>B<![CDATA[C]]></root>'],
    ['<root><a/> <![CDATA[B]]> <b/></root>', '<root><a/> B <b/></root>'],
    ['<root><a/><![CDATA[ \t\n]]><b/></root>', '<root><a/><b/></root>'],
    ['<root xml:space="preserve"><a/> <![CDATA[B]]> </root>', '<root xml:space="preserve"><a/> B </root>'],
  ])('coalesces text and CDATA before filtering formatting whitespace: %s', (left, right) => {
    expect(compareXml(left, right)).toEqual({ status: 'equal' })
  })

  it.each([
    '<root><parsererror>ok</parsererror></root>',
    '<parsererror>ok</parsererror>',
    '<root xmlns:p="urn:user"><p:parsererror>ok</p:parsererror></root>',
  ])('accepts user-defined parsererror elements: %s', xml => {
    expect(compareXml(xml, xml)).toEqual({ status: 'equal' })
  })

  it('reports malformed XML on the right even when the left has a parsererror element', () => {
    expect(compareXml('<root><parsererror>ok</parsererror></root>', '<root>')).toMatchObject({ status: 'invalid', file: 'right' })
  })

  it('detects Chromium XHTML parser-error documents', () => {
    const parser = new DOMParser()
    const leftDocument = parser.parseFromString('<root/>', 'application/xml')
    const chromiumErrorDocument = parser.parseFromString(
      '<root><parsererror xmlns="http://www.w3.org/1999/xhtml">Malformed XML</parsererror></root>',
      'application/xml',
    )
    const parseFromString = vi.spyOn(DOMParser.prototype, 'parseFromString')
      .mockReturnValueOnce(leftDocument)
      .mockReturnValueOnce(chromiumErrorDocument)

    try {
      expect(compareXml('<root/>', '<root>')).toEqual({ status: 'invalid', file: 'right', message: 'Malformed XML' })
    } finally {
      parseFromString.mockRestore()
    }
  })

  it('reports which document is malformed', () => {
    expect(compareXml('<root>', '<root/>')).toMatchObject({ status: 'invalid', file: 'left' })
  })
})
