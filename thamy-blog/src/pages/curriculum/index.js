import * as React from 'react';
import { ThemeProvider } from 'styled-components'

import GreetingsJSONData from "../../../content/Greetings-JSON-Content.json";
import EduJSONData from "../../../content/Edu-JSON-Content.json";
import ExpJSONData from "../../../content/Exp-JSON-Content.json";
import SkillJSONData from "../../../content/Skill-JSON-Content.json";

import COLORS from "../../constants/colors"
import FONTS from '../../constants/fonts';

import GridLayout from '../../components/Layout/GridLayout'
import GlobalStyle from '../../components/GlobalPageStyles'
import GlobalFontStyle from '../../components/GlobalFontStyles';

const Curriculum = () => {
    return (
        <ThemeProvider theme={{ colors:COLORS, fonts:FONTS }}>
            <GlobalFontStyle />
            <GlobalStyle />
            <GridLayout
              verticalTitle={true}
              pageTitle="I'm Thamires Helaysa."
              pageSub={"Front-end dev"}
              greetings={GreetingsJSONData}
              eduContent={EduJSONData}
              expContent={ExpJSONData}
              skillContent={SkillJSONData}>
            </GridLayout>
        </ThemeProvider>
    )
}

export const Head = () => <title>About Me</title>

export default Curriculum
