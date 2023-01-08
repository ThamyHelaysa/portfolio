import * as React from 'react'
import { createGlobalStyle } from 'styled-components'


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
    background-color: ${(props) => props.theme.colors.bodyColor};
    -webkit-background-size: 15px 15px;
    background-size: 15px 15px;
    color: ${(props) => props.theme.colors.text};
    font-family: ${(props) => props.theme.fonts.paraGraphs.fontFamily};
    line-height: 1.5;
    scroll-behavior: smooth;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
    transition: background-color, color 250ms ease;
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
  #root, #__next, #___gatsby {
    isolation: isolate;
  }
`

const GlobalStyle = () => {
    return (
        <Container />
    )
}


export default GlobalStyle;
