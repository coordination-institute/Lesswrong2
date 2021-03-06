import { Utils } from 'meteor/vulcan:core';
import { convertFromRaw } from 'draft-js';
import { draftToHTML } from '../../lib/editor/utils.js';

import TurndownService from 'turndown';
const turndownService = new TurndownService()
turndownService.remove('style') // Make sure we don't add the content of style tags to the markdown

import markdownIt from 'markdown-it'
import markdownItMathjax from './markdown-mathjax.js'
var mdi = markdownIt()
mdi.use(markdownItMathjax())
import { addCallback } from 'meteor/vulcan:core';
import { mjpage }  from 'mathjax-node-page'

import htmlToText from 'html-to-text'

function mjPagePromise(html, beforeSerializationCallback) {
  // Takes in HTML and replaces LaTeX with CommonHTML snippets
  // https://github.com/pkra/mathjax-node-page
  return new Promise((resolve, reject) => {
    mjpage(html, {}, {html: true, css: true}, resolve)
      .on('beforeSerialization', beforeSerializationCallback);
  })
}

const createHtmlHighlight = (body) => {
  if (body.length > 2400) {
    // drop the last paragraph
    const highlight2400Shortened = body.slice(0,2400).split("\n").slice(0,-1).join("\n")
    const highlightnewlineShortened = body.split("\n\n").slice(0,5).join("\n\n")
    if (highlightnewlineShortened.length > highlight2400Shortened.length) {
      return mdi.render(highlight2400Shortened)
    } else {
      return mdi.render(highlightnewlineShortened)
    }
  } else {
    return mdi.render(body)
  }
}

const createExcerpt = (body) => {
  const excerpt = body.slice(0,400)
  if (excerpt.includes("[")) {
    const excerptTrimLink = excerpt.split("[").slice(0, -1).join('[')
    return mdi.render(excerptTrimLink + "... (Read More)")
  } else {
    return mdi.render(excerpt + "... (Read More)")
  }
}

const convertFromContent = (content, fieldName = "") => {
  const contentState = convertFromRaw(content);
  const htmlBody = draftToHTML(contentState)
  const body = htmlToMarkdown(htmlBody)
  return {
    [`${fieldName}htmlBody`]: htmlBody,
    [`${fieldName}body`]: body,
    ...getExcerptFields(body, fieldName),
    [`${fieldName}lastEditedAs`]: 'draft-js'
  }
}

const convertFromContentAsync = async function(content, fieldName = "") {
  const newContent = await Utils.preProcessLatex(content)
  return convertFromContent(newContent, fieldName)
}

const getExcerptFields = (body, fieldName = "") => {
  const wordCount = body.split(" ").length
  const htmlHighlight = createHtmlHighlight(body)
  const excerpt = createExcerpt(body)
  const plaintextExcerpt = htmlToText.fromString(excerpt)
  return {
    [`${fieldName}wordCount`]: wordCount,
    [`${fieldName}htmlHighlight`]:htmlHighlight,
    [`${fieldName}excerpt`]:excerpt,
    [`${fieldName}plaintextExcerpt`]:plaintextExcerpt,
  }
}

const htmlToMarkdown = (html) => {
  return turndownService.turndown(html)
}

const convertFromHTML = (html, sanitize, fieldName = "") => {
  const body = htmlToMarkdown(html)
  const htmlBody = sanitize ? Utils.sanitize(html) : html
  return {
    [`${fieldName}htmlBody`]: htmlBody,
    [`${fieldName}body`]: body,
    ...getExcerptFields(body, fieldName),
    [`${fieldName}lastEditedAs`]: "html",
  }
}

const convertFromMarkdown = (body, fieldName = "") => {
  return {
    [`${fieldName}htmlBody`]: mdi.render(body),
    [`${fieldName}body`]: body,
    ...getExcerptFields(body, fieldName),
    [`${fieldName}lastEditedAs`]: "markdown"
  }
}

const convertFromMarkdownAsync = async (body, fieldName = "") => {
  const newPostFields = convertFromMarkdown(body, fieldName)
  const newHtmlBody = await mjPagePromise(newPostFields.htmlBody, Utils.trimEmptyLatexParagraphs)
  return {
    ...newPostFields,
    [`${fieldName}htmlBody`]: newHtmlBody
  }
}

export function addEditableCallbacks({collection, options = {}}) {
  const { fieldName } = options
  // Promisified version of mjpage

  async function editorSerializationNew(doc, author) {
    let newFields = {}
    let newDoc = {...doc}
    if (doc.content) {
      newFields = await convertFromContentAsync(doc.content, fieldName);
      newDoc = {...doc, ...newFields}
    } else if (doc.body) {
      newFields = await convertFromMarkdownAsync(doc.body, fieldName)
      newDoc = {...doc, ...newFields}
    } else if (doc.htmlBody) {
      newFields = convertFromHTML(doc.htmlBody, !author.isAdmin, fieldName);
      newDoc = {...doc, ...newFields}
    }
    return newDoc
  }
  addCallback(`${collection.options.collectionName.toLowerCase()}.new.sync`, editorSerializationNew);

  async function editorSerializationEdit (modifier, doc, author) {
    let newFields = {}
    let newModifier = {...modifier}
    if (modifier.$set && modifier.$set.content) {
      newFields = await convertFromContentAsync(modifier.$set.content, fieldName)
      newModifier.$set = {...modifier.$set, ...newFields}
      if (modifier.$unset) {delete modifier.$unset.htmlBody}
    } else if (modifier.$set && modifier.$set.body) {
      newFields = await convertFromMarkdownAsync(modifier.$set.body, fieldName)
      newModifier.$set = {...modifier.$set, ...newFields}
      if (modifier.$unset) {delete modifier.$unset.htmlBody}
    } else if (modifier.$set && modifier.$set.htmlBody) {
      newFields = convertFromHTML(modifier.$set.htmlBody, !author.isAdmin, fieldName);
      newModifier.$set = {...modifier.$set, ...newFields}
    }
    return newModifier
  }

  addCallback(`${collection.options.collectionName.toLowerCase()}.edit.sync`, editorSerializationEdit);
}
