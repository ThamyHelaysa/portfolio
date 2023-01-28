import * as React from 'react';
import { graphql } from 'gatsby';

import GreetingsJSONData from "../../../content/Greetings-JSON-Content.json";
import EduJSONData from "../../../content/Edu-JSON-Content.json";
import ExpJSONData from "../../../content/Exp-JSON-Content.json";
import SkillJSONData from "../../../content/Skill-JSON-Content.json";

import GridLayout from '../../components/Layout/GridLayout'
import GlobalStyle from '../../components/GlobalPageStyles'
import GlobalFontStyle from '../../components/GlobalFontStyles';


const Curriculum = ({data}) => {
    const latin_phrases = data.allMongodbPortfolioLatinPhrases.edges;
    return (
        <>
            <GridLayout
              verticalTitle={true}
              pageTitle="I'm Thamires Helaysa."
              pageSub={"Front-end dev"}
              greetings={GreetingsJSONData}
              eduContent={EduJSONData}
              expContent={ExpJSONData}
              skillContent={SkillJSONData}
              dataPhrases={latin_phrases}>
                <GlobalFontStyle />
                <GlobalStyle />
            </GridLayout>
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

export const Head = () => <title>About Me</title>

export default Curriculum;
