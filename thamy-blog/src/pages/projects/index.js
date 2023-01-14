import * as React from 'react';
import { Link } from 'gatsby';

import Layout from '../../components/Layout/Layout';
import GlobalStyle from '../../components/GlobalPageStyles';
import GlobalFontStyle from '../../components/GlobalFontStyles';

import IntroJSONData from '../../../content/ProjIntro-JSON-Content.json'

const projData = [
    { name: "ToDo List", path: "/projects/todo", id: 1, desc: "An simple todo list made with React and Styled Components inside this site." }
]


const IndexPage = () => {
  return (
    <>
      <Layout
        pageTitle="Projects"
        pageSub={""}
        introText={IntroJSONData.item}>
        <GlobalFontStyle />
        <GlobalStyle />
        <ul>
            {projData.map(({ name, path, id }) => (
                <li key={`proj_${id}`}>
                    <Link to={path}>{name}</Link>
                </li>
            ))}
        </ul>
      </Layout>
    </>
  )
}

export const Head = () => <title>Projects</title>

export default IndexPage
