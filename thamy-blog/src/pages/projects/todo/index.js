import * as React from 'react';

import Layout from '../../../components/Layout/Layout';
import GlobalStyle from '../../../components/GlobalPageStyles';
import GlobalFontStyle from '../../../components/GlobalFontStyles';
import App from '../../../components/ToDo/App';


const IndexPage = () => {
  return (
    <>
      <Layout
        pageTitle="ToDo List"
        pageSub={"Give it a try! Start making your own..."}
        introText={""}>
        <GlobalFontStyle />
        <GlobalStyle />
        <App></App>
      </Layout>
    </>
  )
}

export const Head = () => <title>ToDo List</title>

export default IndexPage
