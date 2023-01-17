import * as React from 'react';
import { graphql } from 'gatsby';

import Layout from '../../components/Layout/Layout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import Seo from '../../components/Seo';

const IndexPage = ({ data, children }) => {
  return (
    <>
      <Layout
        pageTitle={data.mdx.frontmatter.title}>
        <GlobalFontStyle />
        <GlobalStyle />
        {children}
      </Layout>
    </>
  )
}

export const query = graphql`
  query ($id: String) {
    mdx(id: {eq: $id}) {
      frontmatter {
        title
        date(formatString: "MMMM D, YYYY")
      }
    }
  }
`

export const Head = () => <Seo title="super cool"></Seo>

export default IndexPage
