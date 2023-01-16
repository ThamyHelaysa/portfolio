import * as React from 'react';

import Layout from '../../components/Layout/Layout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import IntroJSONData from '../../../content/ProjIntro-JSON-Content.json'
import Seo from '../../components/Seo';
import CardsList from '../../components/Navigation/Cards';

const projData = [
  {
    name: "ToDo List",
    path: "/projects/todo",
    id: 1,
    desc: "An simple todo list made with React and Styled Components inside this site.",
    image: {
      name: 'ToDo List Preview',
      path: '../../images/project-0.gif'
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

export const Head = () => <Seo title="Projects"></Seo>

export default IndexPage
