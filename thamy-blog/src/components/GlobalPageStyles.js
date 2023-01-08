import * as React from 'react'
import { createGlobalStyle } from 'styled-components'

import COLORS from "../constants/colors"
import FONTS from '../constants/fonts'

const Container = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }
  * {
    margin: 0;
  }
  html, body {
    height: 100%;
  }
  body {
    background-color: ${COLORS.extra};
    -webkit-background-size: 15px 15px;
    background-size: 15px 15px;
    color: ${COLORS.text};
    font-family: ${FONTS.paraGraphs.fontFamily};
    line-height: 1.5;
    scroll-behavior: smooth;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
  }
  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }
  input, button, textarea, select {
    font: inherit;
  }
  ul, ol {
    padding: 0;
    list-style:none;
  }
  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }
  #root, #__next {
    isolation: isolate;
  }
  #___gatsby, #gatsby-focus-wrapper {
    height: 100%;
  }
`

const GlobalStyle = () => {
    return (
        <Container />
    )
}


export default GlobalStyle;
