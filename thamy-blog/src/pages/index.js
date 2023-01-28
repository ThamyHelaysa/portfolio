import * as React from 'react';
import { graphql } from 'gatsby';

import Layout from '../components/Layout/Layout';
import GlobalStyle from '../components/GlobalPageStyles';
import GlobalFontStyle from '../components/GlobalFontStyles';

import IntroJSONData from '../../content/Intro-JSON-Content.json';
import Seo from '../components/Seo';
import Phrases from '../components/Listing/Phrases';

const IndexPage = ({ data }) => {
  const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
  return (
    <>
      <Layout
        pageTitle="Hello there!"
        pageSub={"Im just a girl and..."}
        introText={IntroJSONData.item}
        dataPhrases={latin_phrases}>
        <GlobalFontStyle />
        <GlobalStyle />
        <Phrases dataPhrases={latin_phrases}></Phrases>
      </Layout>
    </>
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

export const Head = () => <Seo title="Home"></Seo>

export default IndexPage
