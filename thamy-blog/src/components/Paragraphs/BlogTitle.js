import * as React from 'react'
import styled from 'styled-components'

import { TitleH1, TitleH2 } from './PageTitle'


const Heading1 = styled(TitleH1)`
  margin-top: 2rem;
  margin-bottom: 1rem;
  text-align: center;
  @media print {
    margin-top: 1rem;
    font-size: 2rem!important;
    line-height: normal;
  }
`

const Heading2 = styled(TitleH2)`
  margin: 2rem 0;
`

const BlogTitleH1 = ({children}) => {
  return (
    <Heading1>{children}</Heading1>
  )
}

const BlogTitleH2 = ({children}) => {
  return (
    <Heading2>{children}</Heading2>
  )
}

export  { BlogTitleH1, BlogTitleH2 }
