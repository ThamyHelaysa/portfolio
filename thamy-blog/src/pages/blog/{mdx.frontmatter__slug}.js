import * as React from 'react';
import { graphql } from 'gatsby';
import { MDXProvider } from "@mdx-js/react"

import BlogLayout from '../../components/Layout/BlogLayout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import Seo from '../../components/Seo';
import LinkDefault from '../../components/Navigation/LinkDefault';
import BlockQuote from '../../components/Paragraphs/BlockQuote';
import { Paragraph } from '../../components/Paragraphs/Paragraph';
import { BlogTitleH3 } from '../../components/Paragraphs/BlogTitle';

const components = {
  p: Paragraph,
  a: LinkDefault,
  h2: BlogTitleH3,
  blockquote: BlockQuote
}

const IndexPage = ({ data, children }) => {
  return (
    <MDXProvider components={components}>
      <BlogLayout
        pageTitle={data.mdx.frontmatter.title}
        publishData={data.mdx.frontmatter.date}
        tableContents={data.mdx.tableOfContents}
        contentBody={data.mdx.body}>
        <GlobalFontStyle />
        <GlobalStyle />
        {children}
      </BlogLayout>
    </MDXProvider>
  )
}

export const query = graphql`
  query ($id: String) {
    mdx(id: {eq: $id}) {
      frontmatter {
        title
        date(formatString: "MMMM D, YYYY")
      }
      tableOfContents
      body
    }
  }
`

export const Head = () => <Seo title="super cool"></Seo>

export default IndexPage
