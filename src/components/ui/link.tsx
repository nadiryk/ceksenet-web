'use client'

import * as Headless from '@headlessui/react'
import NextLink from 'next/link'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  props: { href: string } & Omit<React.ComponentPropsWithoutRef<typeof NextLink>, 'href'> & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const { href, ...rest } = props
  
  // External links (http://, https://, mailto:, tel:)
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <Headless.DataInteractive>
        <a href={href} ref={ref} {...rest} />
      </Headless.DataInteractive>
    )
  }
  
  // Internal links - use Next.js Link
  return (
    <Headless.DataInteractive>
      <NextLink href={href} ref={ref} {...rest} />
    </Headless.DataInteractive>
  )
})
