import * as React from 'react';
import { ThemeProvider } from 'styled-components';

import COLORS from "../constants/colors";
import FONTS from '../constants/fonts';

import Layout from '../components/Layout/Layout';
import GlobalStyle from '../components/GlobalPageStyles';
import GlobalFontStyle from '../components/GlobalFontStyles';

const IndexPage = () => {
  return (
    <ThemeProvider theme={{ colors:COLORS, fonts:FONTS }}>
      <GlobalFontStyle />
      <GlobalStyle />
      <Layout pageTitle="Hello there!" pageSub={"Im just a girl and..."}>
          Aspiring front-end developer with a passion for creating intuitive and visually appealing user experiences. 
          Skilled in HTML, CSS, and JavaScript, and always looking to learn and stay up-to-date with the latest technologies. 
          Inspired by the mysterious and unsettling world of "The King in Yellow," seeking a position where I can use my skills 
          to bring a touch of the unknown to the digital realm.
      </Layout>
    </ThemeProvider>
  )
}

export const Head = () => <title>Home Page</title>

export default IndexPage
