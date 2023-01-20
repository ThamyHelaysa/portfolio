import * as React from 'react'
import styled from 'styled-components'

import { TitleH1, TitleH3 } from './PageTitle'


const Heading1 = styled(TitleH1)`
  margin-top: 2rem;
  margin-bottom: 1rem;
  text-align: center;
  @media print {
    margin-top: 1rem;
    font-size: 5rem!important;
  }
`

const Heading3 = styled(TitleH3)`
  margin: 2rem 0;
`

const BlogTitleH1 = ({children}) => {
  return (
    <Heading1>{children}</Heading1>
  )
}

const BlogTitleH3 = ({children}) => {
  return (
    <Heading3>{children}</Heading3>
  )
}

export  { BlogTitleH1, BlogTitleH3 }
