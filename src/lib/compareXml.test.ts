import { describe, expect, it } from 'vitest'
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
    expect(compareXml('<x:root xmlns:x="urn:a"/>', '<x:root xmlns:x="urn:b"/>')).toMatchObject({ status: 'different' })
  })

  it('compares comments', () => {
    expect(compareXml('<root><!--a--></root>', '<root><!--b--></root>')).toMatchObject({ status: 'different' })
  })

  it('compares processing instructions', () => {
    expect(compareXml('<root><?mode a?></root>', '<root><?mode b?></root>')).toMatchObject({ status: 'different' })
  })

  it('treats CDATA and text as equivalent', () => {
    expect(compareXml('<root><![CDATA[value]]></root>', '<root>value</root>')).toEqual({ status: 'equal' })
  })

  it('reports which document is malformed', () => {
    expect(compareXml('<root>', '<root/>')).toMatchObject({ status: 'invalid', file: 'left' })
  })
})
