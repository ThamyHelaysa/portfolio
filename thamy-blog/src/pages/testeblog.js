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
      {data.allMdx.nodes.map(node => (
        <span key={node.id}>{node.excerpt}</span>
      ))}
    </Layout>
  )
}

export const query = graphql`
  query {
    allMdx(sort: {frontmatter: {date: DESC}}) {
      nodes {
        frontmatter {
          author
          date(formatString: "D MMMM YYYY")
          slug
          title
        }
        id
        excerpt
        parent {
          ... on File {
            modifiedTime(formatString: "MMMM D, YYYY")
          }
        }
      }
    }
  }
`

export const Head = () => <Seo title="Blog"></Seo>

export default BlogPage
