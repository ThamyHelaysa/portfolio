import * as React from 'react';
import { graphql } from 'gatsby';

import Layout from '../../components/Layout/Layout';

import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';
import Seo from '../../components/Seo';
import CardsList from '../../components/Navigation/Cards';


const BlogPage = ({ data }) => {
  const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
  return (
    <Layout
      pageTitle="Blog"
      pageSub={"here are (maybe) usefull things..."}
      dataPhrases={latin_phrases}
      >
      <GlobalFontStyle />
      <GlobalStyle />
      <CardsList dataList={data.allMdx.nodes} />
    </Layout>
  )
}

export const query = graphql`
  query {
    allMdx(
      sort: {frontmatter: {date: DESC}}
      filter: {frontmatter: {type: {ne: "project"}}}
    ) {
      nodes {
        frontmatter {
          author
          date(formatString: "MMMM D, YYYY")
          slug
          title
          desc
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

export const Head = () => <Seo title="Blog"></Seo>

export default BlogPage
