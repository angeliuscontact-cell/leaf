import { useEffect } from 'react'

export interface DocumentMeta {
  title?: string
  description?: string
  /** Set "noindex, nofollow" for shared documents that should stay out of search. */
  robots?: string
  ogTitle?: string
  ogDescription?: string
  ogType?: 'website' | 'profile' | 'article'
}

/**
 * Applies page metadata and restores the previous values on unmount. Shared
 * CV pages use this to stay out of search indexes without changing index.html.
 */
export function useDocumentMeta(meta: DocumentMeta) {
  const { title, description, robots, ogTitle, ogDescription, ogType } = meta

  useEffect(() => {
    const previousTitle = document.title
    if (title) document.title = title

    type Change = { element: HTMLMetaElement; previous: string | null; created: boolean }
    const changes: Change[] = []

    const apply = (attribute: 'name' | 'property', key: string, content: string | undefined) => {
      if (content === undefined) return
      let element = Array.from(document.head.querySelectorAll<HTMLMetaElement>(`meta[${attribute}="${key}"]`)).find(
        (node) => !node.dataset.leafMeta,
      )
      const created = !element
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        element.dataset.leafMeta = 'true'
        document.head.appendChild(element)
      }
      changes.push({ element, previous: created ? null : element.getAttribute('content'), created })
      element.setAttribute('content', content)
    }

    apply('name', 'description', description)
    apply('name', 'robots', robots)
    apply('property', 'og:title', ogTitle || title)
    apply('property', 'og:description', ogDescription || description)
    apply('property', 'og:type', ogType)

    return () => {
      document.title = previousTitle
      for (const change of changes) {
        if (change.created) change.element.remove()
        else if (change.previous === null) change.element.removeAttribute('content')
        else change.element.setAttribute('content', change.previous)
      }
    }
  }, [title, description, robots, ogTitle, ogDescription, ogType])
}
