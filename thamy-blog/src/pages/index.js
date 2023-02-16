import * as React from 'react';
import styled from 'styled-components';
import { graphql } from 'gatsby';

import Layout from '../components/Layout/Layout';
import GlobalStyle from '../components/GlobalPageStyles';
import GlobalFontStyle from '../components/GlobalFontStyles';

import IntroJSONData from '../../content/Intro-JSON-Content.json';
import Seo from '../components/Seo';
import { TitleH2 } from '../components/Paragraphs/PageTitle';
import Phrases from '../components/Listing/Phrases';
import CardsList from '../components/Navigation/Cards';
import LastPublished from '../components/Listing/LastPublished';



const IndexPage = ({ data }) => {
  const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
  const last_published = data.allMdx.nodes;
  return (
    <>
      <Layout
        pageTitle="Hello there!"
        pageSub={"Im just a girl and..."}
        introText={IntroJSONData.item}
        dataPhrases={latin_phrases}
        pageName="Home">
        <GlobalFontStyle />
        <GlobalStyle />
        <LastPublished blogPosts={last_published}>
          <Phrases className="--phrases" dataPhrases={latin_phrases}></Phrases>
        </LastPublished>
      </Layout>
    </>
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
          date(formatString: "D MMMM YYYY")
          slug
          title
          desc
        }
        excerpt
        id
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

export const Head = () => <Seo title="Home"></Seo>

export default IndexPage
