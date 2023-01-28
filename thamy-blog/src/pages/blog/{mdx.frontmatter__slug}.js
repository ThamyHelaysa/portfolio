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
import Code from '../../components/Paragraphs/CodeInline';

const components = {
  p: Paragraph,
  a: LinkDefault,
  h2: BlogTitleH3,
  blockquote: BlockQuote,
  code: Code,
}

const IndexPage = ({ data, children }) => {
  const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
  return (
    <MDXProvider components={components}>
      <BlogLayout
        pageTitle={data.mdx.frontmatter.title}
        publishData={data.mdx.frontmatter.date}
        tableContents={data.mdx.tableOfContents}
        contentBody={data.mdx.body}
        dataPhrases={latin_phrases}>
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
    allMongodbPortfolioLatinPhrases {
      edges {
        node {
          id
          phrase
          translate
          description
        }
      }
    }
  }
`

export const Head = ({data}) => <Seo title={data.mdx.frontmatter.title}></Seo>

export default IndexPage
