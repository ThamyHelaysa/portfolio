import * as React from 'react';

import Layout from '../../components/Layout/Layout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import IntroJSONData from '../../../content/ProjIntro-JSON-Content.json'
import CardsList from '../../components/Navigation/Cards';

const projData = [
    {
        name: "ToDo List",
        path: "/projects/todo",
        id: 1,
        desc: "An simple todo list made with React and Styled Components inside this site.",
        image: {
            name: 'ToDo List Preview',
            path: ''
        }
    }
]


const IndexPage = () => {
  return (
    <>
      <Layout
        pageTitle="Projects"
        pageSub={"...and things"}
        introText={IntroJSONData.item}>
        <GlobalFontStyle />
        <GlobalStyle />
        <CardsList dataList={projData}/>
      </Layout>
    </>
  )
}

export const Head = () => <title>Projects</title>

export default IndexPage
