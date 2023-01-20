import * as React from 'react';

import Layout from '../../components/Layout/Layout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import IntroJSONData from '../../../content/ProjIntro-JSON-Content.json'
import Seo from '../../components/Seo';
import CardsList from '../../components/Navigation/Cards';

import toDoGIF from '../../images/project-0.gif';

const projData = [
  {
    title: "ToDo List",
    path: "/projects/todo",
    id: 1,
    desc: "An simple todo list with the default functionality (like adding an todo), some error messages, localstorage handler and counter. Made with React and Styled Components implemented here!",
    image: {
      name: 'ToDo List Preview',
      path: toDoGIF
    }
  },
  {
    title: "Intellibus",
    path: "/projects/intellibus",
    id: 2,
    desc: "At the end of 2018 I received the mission to choose a subject for my term paper (or TCC). The result was an app design in collaboration with another student from IT class.",
    image: {
      name: 'ToDo List Preview',
      path: toDoGIF
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
