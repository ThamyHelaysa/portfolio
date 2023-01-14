import * as React from 'react';

import Layout from '../components/Layout/Layout';
import GlobalStyle from '../components/GlobalPageStyles';
import GlobalFontStyle from '../components/GlobalFontStyles';

import IntroJSONData from '../../content/Intro-JSON-Content.json';

const IndexPage = () => {
  return (
    <>
      <Layout
        pageTitle="Hello there!"
        pageSub={"Im just a girl and..."}
        introText={IntroJSONData.item}>
        <GlobalFontStyle />
        <GlobalStyle />
      </Layout>
    </>
  )
}

export const Head = () => <title>Home Page</title>

export default IndexPage
