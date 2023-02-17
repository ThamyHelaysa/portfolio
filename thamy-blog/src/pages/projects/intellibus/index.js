import * as React from 'react';
import { graphql } from 'gatsby';
import { MDXProvider } from '@mdx-js/react';

import Layout from '../../../components/Layout/Layout';
import GlobalStyle from '../../../components/GlobalPageStyles';
import GlobalFontStyle from '../../../components/GlobalFontStyles';
import Seo from '../../../components/Seo';

import { Paragraph } from '../../../components/Paragraphs/Paragraph';
import { BlogTitleH1, BlogTitleH3 } from '../../../components/Paragraphs/BlogTitle';
import IntellibusContent from '../content/intellibus.mdx'
import LinkDefault from '../../../components/Navigation/LinkDefault';
import BlockQuote from '../../../components/Paragraphs/BlockQuote';

const components = {
  p: Paragraph,
  a: LinkDefault,
  h1: BlogTitleH1,
  h2: BlogTitleH3,
  blockquote: BlockQuote
}

const IndexPage = ({data}) => {
  const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
  return (
    <MDXProvider components={components}>
      <Layout
        pageTitle="Intellibus App"
        pageSub={"An app design for my term paper..."}
        introText={""}
        dataPhrases={latin_phrases}>
        <GlobalFontStyle />
        <GlobalStyle />
        <IntellibusContent></IntellibusContent>
      </Layout>
    </MDXProvider>
  )
}
export const query = graphql`
  query {
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

export const Head = () => <Seo title="Todo"></Seo>

export default IndexPage
