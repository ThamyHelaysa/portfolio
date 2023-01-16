import * as React from 'react';

import Layout from '../../components/Layout/Layout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import Seo from '../../components/Seo';

const IndexPage = () => {
  return (
    <>
      <Layout
        pageTitle="Hi!"
        pageSub={"Im just a girl and..."}>
        <GlobalFontStyle />
        <GlobalStyle />
      </Layout>
    </>
  )
}

export const Head = () => <Seo title="super cool"></Seo>

export default IndexPage
