import * as React from 'react';
import { graphql } from 'gatsby';

import Layout from '../components/Layout/Layout';

import GlobalStyle from '../components/GlobalPageStyles';
import GlobalFontStyle from '../components/GlobalFontStyles';
import Seo from '../components/Seo';


const BlogPage = ({ data }) => {
  return (
    <Layout
      pageTitle="Blog"
      pageSub={"here are (maybe) usefull things..."}
      >
      <GlobalFontStyle />
      <GlobalStyle />
      {data.allFile.nodes.map(node => (
        <span key={node.name}>{node.name}</span>
      ))}
    </Layout>
  )
}

export const query = graphql`
  query blogPosts {
    allFile(filter: {sourceInstanceName: {eq: "blog"}}) {
      nodes {
        name
      }
    }
  }
`

export const Head = () => <Seo title="Blog"></Seo>

export default BlogPage
