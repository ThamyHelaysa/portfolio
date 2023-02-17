import * as React from 'react';
import { graphql } from 'gatsby';

import Layout from '../../../components/Layout/Layout';
import GlobalStyle from '../../../components/GlobalPageStyles';
import GlobalFontStyle from '../../../components/GlobalFontStyles';
import App from '../../../components/ToDo/App';
import Seo from '../../../components/Seo';


const IndexPage = ({data}) => {
  const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
  return (
    <>
      <Layout
        pageTitle="ToDo List"
        pageSub={"Give it a try! Start making your own..."}
        introText={""}
        dataPhrases={latin_phrases}>
        <GlobalFontStyle />
        <GlobalStyle />
        <App></App>
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

export const Head = () => <Seo title="Todo"></Seo>

export default IndexPage
